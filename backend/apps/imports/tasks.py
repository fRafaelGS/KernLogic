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
from .services import (
    resolve_category_breadcrumb,
    resolve_family,
    upsert_product,
    attach_attribute_values,
    attach_price_if_present
)
from decimal import Decimal
from .constants import FIELD_SCHEMA

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
    Refactored: Ingests CSV/Excel using new services, no legacy price/stock logic.
    Accepts and persists all canonical schema fields.
    Implements robust defaults for channel/locale.
    """
    task = ImportTask.objects.get(id=task_id)
    task.status = "running"
    task.save(update_fields=["status"])

    start_time = time.time()
    errors = []
    chunk_size = 1000

    try:
        # Get file extension to determine format
        file_path = task.csv_file.path
        file_name = task.csv_file.name
        _, file_ext = os.path.splitext(file_name)
        file_ext = file_ext.lower()

        logger.info(f"Starting import task {task_id} for file {file_name}")

        # Read file
        if file_ext == '.csv':
            df = pd.read_csv(file_path)
        elif file_ext in ('.xls', '.xlsx'):
            engine = 'openpyxl' if file_ext == '.xlsx' else 'xlrd'
            df = pd.read_excel(file_path, engine=engine)
        else:
            raise ValueError(f"Unsupported file type: {file_ext}")

        # Validate mapping
        if not task.mapping:
            raise ValueError("Column mapping is missing. Please define how columns map to product fields.")
        file_columns = set(df.columns)
        mapped_columns = set(task.mapping.keys())
        missing_columns = mapped_columns - file_columns
        if missing_columns:
            raise ValueError(f"Mapped columns not found in file: {', '.join(missing_columns)}")
        required = {"sku"}
        dest_cols = set(task.mapping.values())
        if not required.issubset(dest_cols):
            raise ValueError(f"Missing required field mapping: {required - dest_cols}")
        sku_column = next((col for col, field in task.mapping.items() if field == 'sku'), None)
        if not sku_column:
            raise ValueError("Could not determine SKU column from mapping")

        # Prepare for batch processing
        total_rows = len(df)
        task.total_rows = total_rows
        task.save(update_fields=["total_rows"])
        chunks = [df[i:i+chunk_size] for i in range(0, len(df), chunk_size)]
        total_processed = 0

        # Get org defaults
        org = task.organization
        default_channel = getattr(org, 'default_channel', None)
        default_locale = getattr(org, 'default_locale_ref', None)
        default_currency = getattr(org, 'default_currency', None)
        if not default_channel or not default_locale:
            raise ValueError("Organization is missing default channel or locale.")

        for chunk_idx, chunk_df in enumerate(chunks):
            logger.debug(f"Processing chunk {chunk_idx+1}/{len(chunks)}")
            chunk_df = chunk_df.replace({np.nan: None})
            for idx, row in chunk_df.iterrows():
                try:
                    # Build row dict using mapping, ensuring all canonical fields are present
                    mapped_row = {}
                    for field in FIELD_SCHEMA:
                        src = next((k for k, v in task.mapping.items() if v == field['id']), None)
                        if src and src in row.index and pd.notna(row[src]):
                            mapped_row[field['id']] = row[src]
                        else:
                            mapped_row[field['id']] = None
                    # Apply defaults for channel/locale
                    mapped_row['channel'] = mapped_row['channel'] or default_channel
                    mapped_row['locale'] = mapped_row['locale'] or default_locale
                    # Upsert product
                    product = upsert_product(mapped_row, org)
                    # Attribute group/attributes
                    attributes_json = mapped_row.get('attributes')
                    if attributes_json:
                        try:
                            if isinstance(attributes_json, str):
                                import json
                                attributes_json = json.loads(attributes_json)
                        except Exception as e:
                            errors.append(f"Row {total_processed + idx}: Invalid attributes JSON: {e}")
                            continue
                        attach_attribute_values(product, attributes_json, mapped_row['locale'], mapped_row['channel'])
                    # Price (optional, not in FIELD_SCHEMA but handled if present)
                    price = mapped_row.get('price')
                    if price is not None:
                        try:
                            amount = Decimal(str(price))
                        except Exception as e:
                            errors.append(f"Row {total_processed + idx}: Invalid price: {e}")
                            continue
                        attach_price_if_present(product, amount, mapped_row['channel'], default_currency)
                except Exception as e:
                    errors.append(f"Row {total_processed + idx}: {e}")
            total_processed += len(chunk_df)
            task.processed = total_processed
            task.save(update_fields=["processed"])

        # Save error file if there are errors
        if errors:
            err_content = "\n".join(errors)
            error_filename = f"import_errors_{task_id}_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
            task.error_file.save(error_filename, ContentFile(err_content.encode('utf-8')))
            error_ratio = len(errors) / total_rows if total_rows > 0 else 1
            if error_ratio > 0.1:
                task.status = "error"
            else:
                task.status = "partial_success"
        else:
            task.status = "success"
        task.execution_time = round(time.time() - start_time, 2)
    except Exception as exc:
        logger.exception(f"Import task {task_id} failed: {str(exc)}")
        task.status = "error"
        error_message = f"Fatal error: {str(exc)}\n\n{traceback.format_exc()}"
        error_filename = f"import_fatal_{task_id}_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        task.error_file.save(error_filename, ContentFile(error_message.encode('utf-8')))
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