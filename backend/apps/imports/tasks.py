from celery import shared_task
import pandas as pd
from pathlib import Path
from django.conf import settings
from products.serializers import ProductSerializer
from .models import ImportTask
import numpy as np
from django.db import transaction
from django.core.files.base import ContentFile
import time
import logging
import datetime
import json
from django.db import IntegrityError

logger = logging.getLogger(__name__)

@shared_task
def import_csv_task(task_id: int):
    """
    Process a CSV import task with optimized performance for large files.
    
    Uses batch processing and chunking to handle large files efficiently.
    Provides detailed error reporting for data quality issues.
    """
    task = ImportTask.objects.get(id=task_id)
    task.status = "running"
    task.save(update_fields=["status"])
    
    start_time = time.time()
    errors = []
    chunk_size = 1000  # Process 1000 rows at a time for memory efficiency
    
    try:
        # Determine file type and read appropriate format
        if task.csv_file.name.endswith(".csv"):
            # Use chunksize for memory efficiency with large files
            chunks = pd.read_csv(task.csv_file.path, chunksize=chunk_size)
        elif task.csv_file.name.endswith((".xls", ".xlsx")):
            # Excel files need to be read completely (pandas limitation)
            df = pd.read_excel(task.csv_file.path)
            # Create a single chunk iterator
            chunks = [df]
        else:
            raise ValueError(f"Unsupported file type: {task.csv_file.name}")
        
        # Validate required columns
        required = {"name", "sku", "price"}
        dest_cols = set(task.mapping.values())
        if not required.issubset(dest_cols):
            raise ValueError(f"Missing required columns: {required - dest_cols}")
        
        # Process each chunk
        total_processed = 0
        total_rows = 0
        
        for chunk_idx, chunk_df in enumerate(chunks):
            # Update total rows on first chunk or for Excel files
            if chunk_idx == 0 or not isinstance(chunks, pd.io.parsers.TextFileReader):
                if isinstance(chunks, pd.io.parsers.TextFileReader):
                    # For CSV with chunksize, we don't know total in advance
                    # Estimate based on file size and first chunk
                    first_chunk_bytes = chunk_df.memory_usage(deep=True).sum()
                    file_size = Path(task.csv_file.path).stat().st_size
                    estimated_total = int((file_size / first_chunk_bytes) * len(chunk_df) * 0.8)  # 80% to be conservative
                    task.total_rows = max(estimated_total, 1)  # Ensure at least 1
                else:
                    # For Excel or single chunk, we know the exact count
                    task.total_rows = len(chunk_df)
                task.save(update_fields=["total_rows"])
            
            # Clean and prepare data
            # Replace NaN values with None for proper NULL handling in the database
            chunk_df = chunk_df.replace({np.nan: None})
            
            # Process rows in batches for better performance
            batch_size = 100  # Commit every 100 rows
            current_batch = []
            
            # Process each row in the chunk
            for idx, row in chunk_df.iterrows():
                # Map source columns to destination fields using the mapping
                data = {dst: row[src] for src, dst in task.mapping.items() if dst and src in row}
                
                # Handle numeric fields that might be strings
                if "price" in data and data["price"] is not None:
                    try:
                        # Convert prices like "10,99" or "10.99" to float
                        if isinstance(data["price"], str):
                            # Replace comma with dot for European format
                            price_str = data["price"].replace(",", ".")
                            data["price"] = float(price_str)
                    except (ValueError, TypeError) as e:
                        errors.append(f"Row {total_processed + idx}: Invalid price format '{data.get('price')}': {str(e)}")
                        continue
                
                # Validate and save
                serializer = ProductSerializer(data=data)
                if serializer.is_valid():
                    current_batch.append(serializer)
                else:
                    # Format error messages
                    error_msgs = []
                    for field, field_errors in serializer.errors.items():
                        error_msgs.append(f"{field}: {', '.join(field_errors)}")
                    
                    errors.append(f"Row {total_processed + idx} (SKU: {data.get('sku', 'Unknown')}): {'; '.join(error_msgs)}")
                
                # Commit batch when it reaches the batch size
                if len(current_batch) >= batch_size:
                    save_batch(current_batch, task.created_by, errors)
                    current_batch = []
                
                # Update progress periodically
                if (total_processed + idx) % 100 == 0:
                    task.processed = total_processed + idx
                    task.save(update_fields=["processed"])
            
            # Save any remaining items in the last batch
            if current_batch:
                save_batch(current_batch, task.created_by, errors)
            
            # Update total processed
            total_processed += len(chunk_df)
            task.processed = total_processed
            task.save(update_fields=["processed"])
        
        # Save error file if there are errors
        if errors:
            err_content = "\n".join(errors)
            error_filename = f"import_errors_{task_id}_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
            task.error_file.save(error_filename, ContentFile(err_content.encode('utf-8')))
            task.status = "error" if len(errors) > total_processed * 0.1 else "partial_success"
        else:
            task.status = "success"
        
        # Calculate and store execution time
        execution_time = time.time() - start_time
        task.execution_time = round(execution_time, 2)
        logger.info(f"Import completed in {execution_time:.2f}s. Processed {total_processed} rows with {len(errors)} errors.")
        
    except Exception as exc:
        logger.exception(f"Import task {task_id} failed: {str(exc)}")
        task.status = "error"
        # Save the exception details to the error file
        error_message = f"Fatal error: {str(exc)}"
        error_filename = f"import_fatal_{task_id}_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        task.error_file.save(error_filename, ContentFile(error_message.encode('utf-8')))
        # Still record the execution time
        task.execution_time = round(time.time() - start_time, 2)
    finally:
        task.save()

def save_batch(serializers, user, errors):
    """
    Save a batch of validated serializers using a transaction.
    
    Args:
        serializers: List of validated serializers
        user: User creating the products
        errors: List to append any errors that occur
    """
    with transaction.atomic():
        for serializer in serializers:
            try:
                serializer.save(created_by=user)
            except IntegrityError as e:
                if "UNIQUE constraint" in str(e) and "sku" in str(e).lower():
                    # Handle duplicate SKU more gracefully
                    data = serializer.validated_data
                    errors.append(f"Duplicate SKU: '{data.get('sku')}' already exists in the database")
                else:
                    # Other database errors
                    errors.append(f"Database error: {str(e)}")
            except Exception as e:
                # Catch and log any other unexpected errors
                errors.append(f"Error saving product: {str(e)}") 