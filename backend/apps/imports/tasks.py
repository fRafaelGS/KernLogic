from celery import shared_task
import pandas as pd
from pathlib import Path
from django.conf import settings
from products.serializers import ProductSerializer
from products.models import Product
from .models import ImportTask
import numpy as np
from django.db import transaction
from django.core.files.base import ContentFile
import time
import logging
import datetime
import json
from django.db import IntegrityError
import os
import traceback
from kernlogic.utils import get_user_organization

logger = logging.getLogger(__name__)

def generate_error_report(in_file_dupes, existing_skus):
    """Generate an error report file for duplicate SKUs."""
    error_lines = []
    
    if in_file_dupes is not None and not in_file_dupes.empty:
        error_lines.append("== DUPLICATE SKUS WITHIN THE UPLOADED FILE ==")
        for sku, group in in_file_dupes.groupby('sku'):
            error_lines.append(f"SKU '{sku}' appears {len(group)} times in the file")
        error_lines.append("")
        
    if existing_skus:
        error_lines.append("== SKUS THAT ALREADY EXIST IN THE DATABASE ==")
        for sku in existing_skus:
            error_lines.append(f"SKU '{sku}' already exists in the database")
            
    return ContentFile("\n".join(error_lines).encode('utf-8'))

def process_tags(tags_value):
    """
    Process tags from different formats into a list.
    
    Args:
        tags_value: Tags value from CSV (string or other)
    
    Returns:
        List of tags
    """
    if tags_value is None or pd.isna(tags_value):
        return []
        
    # If it's already a list, return it
    if isinstance(tags_value, list):
        return tags_value
        
    # If it's a string, try different formats
    if isinstance(tags_value, str):
        # Try JSON format first
        if (tags_value.startswith('[') and tags_value.endswith(']')) or \
           (tags_value.startswith('{') and tags_value.endswith('}')):
            try:
                return json.loads(tags_value)
            except json.JSONDecodeError:
                pass
                
        # Try pipe-separated format
        if '|' in tags_value:
            return [tag.strip() for tag in tags_value.split('|') if tag.strip()]
            
        # Try comma-separated format
        if ',' in tags_value:
            return [tag.strip() for tag in tags_value.split(',') if tag.strip()]
            
        # Single tag
        if tags_value.strip():
            return [tags_value.strip()]
            
    return []

@shared_task
def import_csv_task(task_id: int):
    """
    Process a CSV or Excel import task with optimized performance for large files.
    
    Uses batch processing and chunking to handle large files efficiently.
    Provides detailed error reporting for data quality issues.
    Handles duplicate SKUs according to the specified strategy.
    """
    task = ImportTask.objects.get(id=task_id)
    task.status = "running"
    task.save(update_fields=["status"])
    
    start_time = time.time()
    errors = []
    chunk_size = 1000  # Process 1000 rows at a time for memory efficiency
    
    try:
        # Get file extension to determine format
        file_path = task.csv_file.path
        file_name = task.csv_file.name
        _, file_ext = os.path.splitext(file_name)
        file_ext = file_ext.lower()
        
        logger.info(f"Starting import task {task_id} for file {file_name}")
        
        # Determine file type and read appropriate format
        try:
            if file_ext == '.csv':
                # Use chunksize for memory efficiency with large files
                df = pd.read_csv(file_path)
            elif file_ext in ('.xls', '.xlsx'):
                # Excel files need to be read completely (pandas limitation)
                # Explicitly set engine for different Excel formats
                engine = 'openpyxl' if file_ext == '.xlsx' else 'xlrd'
                df = pd.read_excel(file_path, engine=engine)
            else:
                raise ValueError(f"Unsupported file type: {file_ext}")
                
            # Log column information for debugging
            logger.debug(f"Columns in the file: {', '.join(df.columns.tolist())}")
        except Exception as e:
            logger.error(f"Error reading file {file_name}: {e}")
            logger.error(traceback.format_exc())
            raise ValueError(f"Failed to read {file_ext} file: {str(e)}")
            
        # Validate required mappings
        if not task.mapping:
            raise ValueError("Column mapping is missing. Please define how columns map to product fields.")
            
        # Validate mapping against file columns
        file_columns = set(df.columns)
        mapped_columns = set(task.mapping.keys())
        missing_columns = mapped_columns - file_columns
        
        if missing_columns:
            missing_cols_str = ", ".join(missing_columns)
            logger.error(f"Columns in mapping not found in file: {missing_cols_str}")
            raise ValueError(f"Mapped columns not found in file: {missing_cols_str}")
            
        # Validate required fields in the mapping
        required = {"sku"}  # Simplify to just requiring SKU
        dest_cols = set(task.mapping.values())
        if not required.issubset(dest_cols):
            missing_fields = required - dest_cols
            raise ValueError(f"Missing required field mapping: {missing_fields}")
            
        # Find SKU column from mapping
        sku_column = next((col for col, field in task.mapping.items() if field == 'sku'), None)
        if not sku_column:
            raise ValueError("Could not determine SKU column from mapping")
            
        # Check for duplicates within the file itself
        try:
            in_file_dupes = df[df.duplicated(subset=[sku_column], keep=False)]
        except KeyError:
            logger.error(f"SKU column '{sku_column}' not found in file columns: {df.columns.tolist()}")
            raise ValueError(f"SKU column '{sku_column}' not found in file")
            
        # Process SKUs
        unique_skus = df[sku_column].dropna().unique()
        
        # Log number of SKUs for debugging
        logger.info(f"Found {len(unique_skus)} unique SKUs in file")
        
        # Check for existing SKUs in the database
        existing_skus = set(
            Product.objects.filter(
                created_by=task.created_by,
                organization=task.organization,
                sku__in=unique_skus
            ).values_list("sku", flat=True)
        )
        
        logger.info(f"Found {len(existing_skus)} SKUs that already exist in database")
        
        # If using "abort" strategy and duplicates are found, stop the import
        if task.duplicate_strategy == "abort" and (not in_file_dupes.empty or existing_skus):
            error_file_content = generate_error_report(in_file_dupes, existing_skus)
            error_filename = f"import_duplicates_{task_id}_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
            task.error_file.save(error_filename, error_file_content)
            task.status = "error"
            task.execution_time = round(time.time() - start_time, 2)
            task.save()
            logger.warning(f"Import aborted due to duplicate SKUs according to strategy")
            return
            
        # Prepare data frames based on strategy
        if task.duplicate_strategy == "skip":
            # Remove rows with SKUs that already exist in the database
            if existing_skus:
                df = df[~df[sku_column].isin(existing_skus)]
                logger.info(f"Skipping {len(existing_skus)} existing SKUs")
                
        # Set total rows count for status tracking
        total_rows = len(df)
        task.total_rows = total_rows
        task.save(update_fields=["total_rows"])
        logger.info(f"Processing {total_rows} rows after applying duplicate strategy")
        
        # Process the data in chunks for large files
        chunks = [df[i:i+chunk_size] for i in range(0, len(df), chunk_size)]
        
        total_processed = 0
        
        for chunk_idx, chunk_df in enumerate(chunks):
            logger.debug(f"Processing chunk {chunk_idx+1}/{len(chunks)}")
            
            # Clean and prepare data
            # Replace NaN values with None for proper NULL handling in the database
            chunk_df = chunk_df.replace({np.nan: None})
            
            # Process rows in batches for better performance
            batch_size = 100  # Commit every 100 rows
            current_batch = []
            overwrite_batch = []
            
            # Process each row in the chunk
            for idx, row in chunk_df.iterrows():
                # Map source columns to destination fields using the mapping
                data = {}
                for src, dst in task.mapping.items():
                    if dst and src in row.index:
                        # Only include fields that exist in the row
                        value = row[src]
                        # Skip empty values
                        if pd.notna(value):
                            # Process tags field differently
                            if dst == 'tags':
                                data[dst] = process_tags(value)
                            else:
                                data[dst] = value
                
                # Skip rows with no SKU
                if "sku" not in data or not data["sku"]:
                    errors.append(f"Row {total_processed + idx}: Missing SKU value")
                    continue
                
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
                
                # Check if this SKU already exists and should be overwritten
                sku = data.get("sku")
                if sku in existing_skus and task.duplicate_strategy == "overwrite":
                    overwrite_batch.append(data)
                    continue
                
                # For new products or "skip" strategy (existing SKUs already filtered)
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
                if (total_processed + idx) % 200 == 0:
                    task.processed = total_processed + idx
                    task.save(update_fields=["processed"])
            
            # Save any remaining items in the last batch
            if current_batch:
                save_batch(current_batch, task.created_by, errors)
            
            # Handle overwrite batch
            if overwrite_batch:
                save_overwrite_batch(overwrite_batch, task.created_by, errors)
            
            # Update total processed
            total_processed += len(chunk_df)
            task.processed = total_processed
            task.save(update_fields=["processed"])
            logger.debug(f"Processed {total_processed}/{total_rows} rows so far")
        
        # Save error file if there are errors
        if errors:
            err_content = "\n".join(errors)
            error_filename = f"import_errors_{task_id}_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
            task.error_file.save(error_filename, ContentFile(err_content.encode('utf-8')))
            
            # Determine if there were too many errors to be considered successful
            error_ratio = len(errors) / total_rows if total_rows > 0 else 1
            if error_ratio > 0.1:  # More than 10% errors
                task.status = "error"
                logger.warning(f"Import failed with {len(errors)}/{total_rows} rows having errors ({error_ratio:.1%})")
            else:
                task.status = "partial_success"
                logger.info(f"Import partially successful with {len(errors)}/{total_rows} rows having errors ({error_ratio:.1%})")
        else:
            task.status = "success"
            logger.info(f"Import completed successfully with {total_processed} rows")
        
        # Calculate and store execution time
        execution_time = time.time() - start_time
        task.execution_time = round(execution_time, 2)
        
    except Exception as exc:
        logger.exception(f"Import task {task_id} failed: {str(exc)}")
        task.status = "error"
        # Save the exception details to the error file
        error_message = f"Fatal error: {str(exc)}\n\n{traceback.format_exc()}"
        error_filename = f"import_fatal_{task_id}_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        task.error_file.save(error_filename, ContentFile(error_message.encode('utf-8')))
        # Still record the execution time
        task.execution_time = round(time.time() - start_time, 2)
    finally:
        task.save()
        logger.info(f"Import task {task_id} completed with status: {task.status}")

def save_batch(serializers, user, errors):
    """
    Save a batch of products to the database.
    """
    try:
        with transaction.atomic():
            for serializer in serializers:
                try:
                    # Get organization using utility function
                    organization = get_user_organization(user)
                    
                    # Save the product
                    serializer.save(
                        created_by=user,
                        organization=organization
                    )
                except IntegrityError as e:
                    # Handle possible race condition with unique constraint
                    if "duplicate key" in str(e) and "sku" in str(e):
                        errors.append(f"SKU '{serializer.validated_data.get('sku')}' already exists")
                    else:
                        errors.append(f"Database error: {str(e)}")
                except Exception as e:
                    errors.append(f"Error saving product '{serializer.validated_data.get('sku', 'Unknown')}': {str(e)}")
    except Exception as e:
        errors.append(f"Transaction error: {str(e)}")
        logger.error(f"Failed to save batch: {str(e)}")
        logger.error(traceback.format_exc())

def save_overwrite_batch(data_list, user, errors):
    """
    Update existing products with new data from import.
    """
    # Get organization using utility function
    organization = get_user_organization(user)
    
    for data in data_list:
        try:
            # Get existing product by SKU
            sku = data.get('sku')
            try:
                product = Product.objects.get(
                    sku=sku, 
                    created_by=user,
                    organization=organization
                )
                
                # Update product with new data
                serializer = ProductSerializer(product, data=data, partial=True)
                if serializer.is_valid():
                    serializer.save()
                else:
                    # Format error messages
                    error_msgs = []
                    for field, field_errors in serializer.errors.items():
                        error_msgs.append(f"{field}: {', '.join(field_errors)}")
                    
                    errors.append(f"Could not update SKU '{sku}': {'; '.join(error_msgs)}")
            except Product.DoesNotExist:
                errors.append(f"Product with SKU '{sku}' no longer exists")
            except Product.MultipleObjectsReturned:
                errors.append(f"Multiple products found with SKU '{sku}'")
        except Exception as e:
            errors.append(f"Error updating product SKU '{data.get('sku', 'Unknown')}': {str(e)}")
            logger.error(f"Error in overwrite: {str(e)}")
            logger.error(traceback.format_exc()) 