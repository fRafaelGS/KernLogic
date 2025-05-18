from celery import shared_task
import pandas as pd
from pathlib import Path
from django.conf import settings
from products.serializers import ProductSerializer
from products.models import Product, AttributeGroup, Attribute, Family, AttributeValue
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
    attach_price_if_present,
    upsert_attribute_group,
    upsert_attribute,
    upsert_family,
    parse_attribute_header,
    process_tags,
    build_family_attribute_map,
    validate_family,
    validate_attribute_in_family,
    auto_attach_attribute_to_family,
    ERROR_FAMILY_UNKNOWN,
    ERROR_NOT_IN_FAMILY
)
from .constants import (
    FIELD_SCHEMA, 
    ATTRIBUTE_GROUP_SCHEMA, 
    ATTRIBUTE_SCHEMA, 
    FAMILY_SCHEMA,
    IMPORT_RELAX_TEMPLATE,
    ERROR_CODES,
    FIELD_SCHEMA_V2,
    ATTRIBUTE_HEADER_REGEX
)
import csv
import io

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

@shared_task
def import_csv_task(task_id: int):
    """
    Refactored: Ingests CSV/Excel using new services, no legacy price/stock logic.
    Validates family and attribute relationships.
    Implements robust defaults for channel/locale.
    """
    task = ImportTask.objects.get(id=task_id)
    task.status = "running"
    task.save(update_fields=["status"])

    start_time = time.time()
    errors = []
    chunk_size = 1000

    # Create error CSV file
    error_file = io.StringIO()
    error_writer = csv.writer(error_file)
    error_writer.writerow(['Row', 'SKU', 'Field', 'Error'])

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
        
        # Build family attribute map for validation
        family_attr_map = build_family_attribute_map(org.id)

        for chunk_idx, chunk_df in enumerate(chunks):
            logger.debug(f"Processing chunk {chunk_idx+1}/{len(chunks)}")
            chunk_df = chunk_df.replace({np.nan: None})
            
            # Process all the rows in the chunk
            for idx, row in chunk_df.iterrows():
                row_num = total_processed + idx + 2  # +2 for header row and 1-indexing
                try:
                    # Build row dict using mapping, ensuring all canonical fields are present
                    mapped_row = {}
                    
                    # First, process the mapped fields
                    for field in FIELD_SCHEMA:
                        src = next((k for k, v in task.mapping.items() if v == field['id']), None)
                        if src and src in row.index and pd.notna(row[src]):
                            mapped_row[field['id']] = row[src]
                        else:
                            mapped_row[field['id']] = None
                    
                    # Apply defaults for channel/locale
                    mapped_row['channel'] = mapped_row['channel'] or default_channel
                    mapped_row['locale'] = mapped_row['locale'] or default_locale
                    
                    # Validate family if present
                    family_code = mapped_row.get('family_code')
                    if family_code:
                        valid, error = validate_family(family_code, family_attr_map)
                        if not valid:
                            error_msg = ERROR_CODES.get(error, f"Error code: {error}")
                            error_line = [row_num, mapped_row.get('sku', ''), 'family_code', f"{error_msg} - Family '{family_code}' not found"]
                            error_writer.writerow(error_line)
                            errors.append(f"Row {row_num}: {error_msg} - Family '{family_code}' not found")
                            continue
                    
                    # Handle duplicate strategy
                    sku = mapped_row.get('sku')
                    if not sku:
                        error_line = [row_num, '', 'sku', 'SKU is required']
                        error_writer.writerow(error_line)
                        errors.append(f"Row {row_num}: SKU is required")
                        continue
                        
                    # Prepare core fields for upsert
                    core_fields = {
                        'name': mapped_row.get('name'),
                        'description': mapped_row.get('description'),
                        'brand': mapped_row.get('brand'),
                        'barcode': mapped_row.get('gtin'),  # Map gtin to barcode
                        'is_active': True,
                        'created_by': task.created_by,
                        'organization': org
                    }
                    
                    # Set category if present
                    if mapped_row.get('category'):
                        cat = resolve_category_breadcrumb(mapped_row['category'], org)
                        if cat:
                            core_fields['category'] = cat
                            
                    # Set family if present
                    if family_code:
                        family = resolve_family(family_code, org)
                        if family:
                            core_fields['family'] = family
                    
                    # Handle duplicate SKUs according to policy
                    existing_product = Product.objects.filter(sku=sku, organization=org).first()
                    if existing_product:
                        # Check duplicate strategy
                        if task.duplicate_strategy == 'skip':
                            # Log that we skipped this row
                            error_line = [row_num, sku, 'sku', ERROR_CODES['DUPLICATE_SKU_SKIPPED']]
                            error_writer.writerow(error_line)
                            total_processed += 1
                            continue
                        elif task.duplicate_strategy == 'overwrite':
                            # Update existing product
                            for field, value in core_fields.items():
                                if value is not None:  # Only update non-None values
                                    setattr(existing_product, field, value)
                            existing_product.save()
                            product = existing_product
                        elif task.duplicate_strategy == 'abort':
                            # Add error and skip
                            error_line = [row_num, sku, 'sku', ERROR_CODES['DUPLICATE_SKU']]
                            error_writer.writerow(error_line)
                            errors.append(f"Row {row_num}: {ERROR_CODES['DUPLICATE_SKU']}")
                            continue
                    else:
                        # Create new product
                        product = Product.objects.create(
                            sku=sku,
                            **core_fields
                        )
                    
                    # Process tags if present
                    if mapped_row.get('tags'):
                        tags = process_tags(mapped_row['tags'])
                        product.set_tags(tags)
                        product.save(update_fields=['tags'])
                    
                    # Process dynamic attribute headers in format: attribute_code-locale-channel
                    # Look for columns that were not part of the standard mapping
                    attribute_errors = []
                    
                    # Check for attribute columns that weren't in the standard mapping
                    attribute_columns = {}
                    for col in file_columns:
                        if col not in task.mapping and pd.notna(row[col]) and row[col] is not None:
                            # Validate column header format with regex
                            if not ATTRIBUTE_HEADER_REGEX.match(col):
                                continue
                                
                            # Parse the column header
                            attr_code, locale_code, channel_code = parse_attribute_header(col)
                            
                            # Skip if we couldn't parse it
                            if not attr_code:
                                continue
                                
                            # Use defaults for locale/channel if not specified
                            actual_locale = locale_code or mapped_row['locale']
                            actual_channel = channel_code or mapped_row['channel']
                            
                            # Value from the CSV
                            attribute_value = row[col]
                            
                            # Only process if we have a value
                            if attribute_value is not None:
                                # First, validate that this attribute is allowed for this family (if any)
                                if family_code:
                                    attr_valid, attr_error = validate_attribute_in_family(
                                        attr_code, family_code, family_attr_map, IMPORT_RELAX_TEMPLATE
                                    )
                                    
                                    if not attr_valid:
                                        error_msg = ERROR_CODES.get(attr_error, f"Error code: {attr_error}")
                                        attribute_errors.append(f"{error_msg} - Attribute '{attr_code}' not in family '{family_code}'")
                                        error_line = [row_num, sku, col, f"{error_msg} - Attribute '{attr_code}' not in family '{family_code}'"]
                                        error_writer.writerow(error_line)
                                        continue
                                    
                                    # If IMPORT_RELAX_TEMPLATE is True, try to auto-attach the attribute to the family
                                    if IMPORT_RELAX_TEMPLATE:
                                        auto_attach_attribute_to_family(attr_code, family_code, org.id)
                                
                                # Store for later processing
                                key = (attr_code, actual_locale, actual_channel)
                                attribute_columns[key] = attribute_value
                    
                    # If there were attribute errors, record them but continue processing the row
                    if attribute_errors:
                        for error in attribute_errors:
                            errors.append(f"Row {row_num}: {error}")
                    
                    # Process the attribute values
                    if attribute_columns:
                        for (attr_code, locale, channel), value in attribute_columns.items():
                            try:
                                # Find the attribute
                                attr = Attribute.objects.filter(
                                    code=attr_code, organization=org
                                ).first()
                                
                                # If not found, try more flexible matching
                                if not attr:
                                    # Try normalizing the attribute code (remove underscores, etc)
                                    normalized_code = attr_code.replace('_', '').lower()
                                    
                                    # Look for attributes with similar codes
                                    potential_attributes = Attribute.objects.filter(organization=org)
                                    for potential_attr in potential_attributes:
                                        potential_normalized = potential_attr.code.replace('_', '').lower()
                                        if potential_normalized == normalized_code:
                                            attr = potential_attr
                                            break
                                        
                                        # Check if one code contains the other
                                        if normalized_code in potential_normalized or potential_normalized in normalized_code:
                                            # Additional check if they're very similar
                                            if len(normalized_code) > 5 and len(potential_normalized) > 5:
                                                attr = potential_attr
                                                break
                                
                                # Try matching by label if code matching failed
                                if not attr:
                                    # Format attribute code into a human-readable form for label comparison
                                    readable_attr = attr_code.replace('_', ' ').title()
                                    attr = Attribute.objects.filter(
                                        label__icontains=readable_attr, organization=org
                                    ).first()
                                
                                if not attr:
                                    error_msg = f"Attribute '{attr_code}' not found"
                                    errors.append(f"Row {row_num}: {error_msg}")
                                    error_line = [row_num, sku, attr_code, error_msg]
                                    error_writer.writerow(error_line)
                                    continue
                                
                                # Find the locale
                                locale_obj = None
                                if locale:
                                    from products.models import Locale
                                    
                                    # Check if locale is already a Locale object
                                    if isinstance(locale, Locale):
                                        locale_obj = locale
                                    else:
                                        # Try to find locale by code first
                                        locale_obj = Locale.objects.filter(
                                            code=locale, organization=org
                                        ).first()
                                        
                                        # If not found and locale is a string with "Name (code)" format
                                        if not locale_obj and isinstance(locale, str) and '(' in locale and ')' in locale:
                                            # Try to extract code from format "Name (code)"
                                            try:
                                                code_match = locale.split('(')[1].split(')')[0].strip()
                                                # Try finding by extracted code
                                                locale_obj = Locale.objects.filter(
                                                    code=code_match, organization=org
                                                ).first()
                                                
                                                # If still not found, try finding by label
                                                if not locale_obj:
                                                    locale_obj = Locale.objects.filter(
                                                        label__icontains=locale, organization=org
                                                    ).first()
                                            except IndexError:
                                                pass
                                        
                                        # If still not found and locale is a string, try finding by label as fallback
                                        if not locale_obj and isinstance(locale, str):
                                            locale_obj = Locale.objects.filter(
                                                label__icontains=locale, organization=org
                                            ).first()
                                    
                                    if not locale_obj:
                                        error_msg = f"Locale '{locale}' not found"
                                        errors.append(f"Row {row_num}: {error_msg}")
                                        error_line = [row_num, sku, f"{attr_code}-{locale}", error_msg]
                                        error_writer.writerow(error_line)
                                        continue
                                
                                # Create/update the attribute value
                                AttributeValue.objects.update_or_create(
                                    product=product,
                                    attribute=attr,
                                    locale=locale_obj,
                                    channel=channel,
                                    organization=org,
                                    defaults={'value': value}
                                )
                            except Exception as e:
                                error_msg = f"Error setting attribute {attr_code}: {str(e)}"
                                errors.append(f"Row {row_num}: {error_msg}")
                                error_line = [row_num, sku, attr_code, error_msg]
                                error_writer.writerow(error_line)
                                logger.error(f"Error processing attribute {attr_code} for product {sku}: {str(e)}")
                                logger.error(traceback.format_exc())
                    
                    total_processed += 1
                except Exception as e:
                    errors.append(f"Row {row_num}: Unexpected error: {str(e)}")
                    error_line = [row_num, mapped_row.get('sku', ''), '', f"Unexpected error: {str(e)}"]
                    error_writer.writerow(error_line)
                    logger.error(f"Error processing row {row_num}: {str(e)}")
                    logger.error(traceback.format_exc())
                
            # Update task progress
            task.processed = total_processed
            task.save(update_fields=["processed"])
        
        # Save task status based on errors
        if errors:
            if total_processed > 0:
                task.status = "partial_success"
            else:
                task.status = "error"
            
            # Save error file
            error_file.seek(0)
            task.error_file.save(
                f"import_errors_{task_id}.csv",
                ContentFile(error_file.getvalue().encode('utf-8'))
            )
            
            # Save error count to model for UI display
            task.error_count = len(errors)
        else:
            task.status = "success"
            task.error_count = 0
        
        task.execution_time = time.time() - start_time
        task.save(update_fields=["status", "execution_time", "error_file", "error_count"])
        
        return {
            "id": task.id,
            "status": task.status,
            "processed": total_processed,
            "total_rows": total_rows,
            "errors": len(errors),
            "execution_time": task.execution_time
        }
    
    except Exception as e:
        logger.error(f"Error in import task {task_id}: {str(e)}")
        logger.error(traceback.format_exc())
        task.status = "error"
        task.execution_time = time.time() - start_time
        
        # Save error file with task-level error
        error_writer.writerow([0, '', '', f"Task error: {str(e)}"])
        error_file.seek(0)
        task.error_file.save(
            f"import_errors_{task_id}.csv",
            ContentFile(error_file.getvalue().encode('utf-8'))
        )
        task.save(update_fields=["status", "execution_time", "error_file"])
        
        return {
            "id": task.id,
            "status": "error",
            "error": str(e),
            "execution_time": task.execution_time
        }

@shared_task
def import_attribute_groups_task(task_id: int):
    """
    Import attribute groups from a CSV or Excel file.
    
    Expected columns:
    - code: Unique identifier for the attribute group
    - label_en: English label for the group
    - sort_order: Optional ordering value
    """
    task = ImportTask.objects.get(id=task_id)
    task.status = "running"
    task.save(update_fields=["status"])

    start_time = time.time()
    errors = []
    chunk_size = 500

    try:
        # Get file extension to determine format
        file_path = task.csv_file.path
        file_name = task.csv_file.name
        _, file_ext = os.path.splitext(file_name)
        file_ext = file_ext.lower()

        logger.info(f"Starting attribute group import task {task_id} for file {file_name}")

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
            raise ValueError("Column mapping is missing. Please define how columns map to attribute group fields.")
        file_columns = set(df.columns)
        mapped_columns = set(task.mapping.keys())
        missing_columns = mapped_columns - file_columns
        if missing_columns:
            raise ValueError(f"Mapped columns not found in file: {', '.join(missing_columns)}")
        
        # Check required fields
        required = {"code", "label_en"}
        dest_cols = set(task.mapping.values())
        if not required.issubset(dest_cols):
            raise ValueError(f"Missing required field mapping: {required - dest_cols}")

        # Prepare for batch processing
        total_rows = len(df)
        task.total_rows = total_rows
        task.save(update_fields=["total_rows"])
        chunks = [df[i:i+chunk_size] for i in range(0, len(df), chunk_size)]
        total_processed = 0

        # Get organization
        org = task.organization
        user = task.created_by

        # Process each chunk
        for chunk_idx, chunk_df in enumerate(chunks):
            logger.debug(f"Processing chunk {chunk_idx+1}/{len(chunks)}")
            chunk_df = chunk_df.replace({np.nan: None})
            
            for idx, row in chunk_df.iterrows():
                try:
                    # Build row dict using mapping
                    mapped_row = {}
                    for field in ATTRIBUTE_GROUP_SCHEMA:
                        field_id = field['id']
                        src = next((k for k, v in task.mapping.items() if v == field_id), None)
                        if src and src in row.index and pd.notna(row[src]):
                            mapped_row[field_id] = row[src]
                        else:
                            mapped_row[field_id] = None
                    
                    # Create or update attribute group
                    group = upsert_attribute_group(mapped_row, org, user)
                    logger.debug(f"Processed attribute group: {group.name}")
                    
                except Exception as e:
                    errors.append(f"Row {total_processed + idx}: {e}")
            
            # Update progress
            total_processed += len(chunk_df)
            task.processed = total_processed
            task.save(update_fields=["processed"])

        # Save error file if there are errors
        if errors:
            err_content = "\n".join(errors)
            error_filename = f"attribute_group_import_errors_{task_id}_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
            task.error_file.save(error_filename, ContentFile(err_content.encode('utf-8')))
            task.status = "partial_success" if total_processed > 0 else "error"
        else:
            task.status = "success"
            
        # Record execution time
        task.execution_time = time.time() - start_time
        task.save(update_fields=["status", "execution_time"])
        
        logger.info(f"Completed attribute group import task {task_id}, status: {task.status}, processed: {total_processed}/{total_rows}")
        
    except Exception as e:
        logger.error(f"Error in attribute group import task {task_id}: {str(e)}\n{traceback.format_exc()}")
        
        error_content = f"Attribute group import failed: {str(e)}"
        error_filename = f"attribute_group_import_error_{task_id}_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        
        task.error_file.save(error_filename, ContentFile(error_content.encode('utf-8')))
        task.status = "error"
        task.execution_time = time.time() - start_time
        task.save(update_fields=["status", "error_file", "execution_time"])
        
        raise

@shared_task
def import_attributes_task(task_id: int):
    """
    Import attributes from a CSV or Excel file.
    
    Expected columns:
    - code: Unique identifier for the attribute
    - type: Data type (text, number, etc.)
    - group_code: Code of the attribute group this attribute belongs to
    - is_localizable: Whether the attribute can have different values per locale
    - is_scopable: Whether the attribute can have different values per channel
    - validation_rule: Optional validation rule to apply
    """
    task = ImportTask.objects.get(id=task_id)
    task.status = "running"
    task.save(update_fields=["status"])

    start_time = time.time()
    errors = []
    chunk_size = 500

    try:
        # Get file extension to determine format
        file_path = task.csv_file.path
        file_name = task.csv_file.name
        _, file_ext = os.path.splitext(file_name)
        file_ext = file_ext.lower()

        logger.info(f"Starting attribute import task {task_id} for file {file_name}")

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
            raise ValueError("Column mapping is missing. Please define how columns map to attribute fields.")
        file_columns = set(df.columns)
        mapped_columns = set(task.mapping.keys())
        missing_columns = mapped_columns - file_columns
        if missing_columns:
            raise ValueError(f"Mapped columns not found in file: {', '.join(missing_columns)}")
        
        # Check required fields
        required = {"code", "type", "group_code"}
        dest_cols = set(task.mapping.values())
        if not required.issubset(dest_cols):
            raise ValueError(f"Missing required field mapping: {required - dest_cols}")

        # Prepare for batch processing
        total_rows = len(df)
        task.total_rows = total_rows
        task.save(update_fields=["total_rows"])
        chunks = [df[i:i+chunk_size] for i in range(0, len(df), chunk_size)]
        total_processed = 0

        # Get organization
        org = task.organization
        user = task.created_by

        # Process each chunk
        for chunk_idx, chunk_df in enumerate(chunks):
            logger.debug(f"Processing chunk {chunk_idx+1}/{len(chunks)}")
            chunk_df = chunk_df.replace({np.nan: None})
            
            for idx, row in chunk_df.iterrows():
                try:
                    # Build row dict using mapping
                    mapped_row = {}
                    for field in ATTRIBUTE_SCHEMA:
                        field_id = field['id']
                        src = next((k for k, v in task.mapping.items() if v == field_id), None)
                        if src and src in row.index and pd.notna(row[src]):
                            mapped_row[field_id] = row[src]
                        else:
                            mapped_row[field_id] = None
                    
                    # Create or update attribute
                    attribute = upsert_attribute(mapped_row, org, user)
                    logger.debug(f"Processed attribute: {attribute.code}")
                    
                except Exception as e:
                    errors.append(f"Row {total_processed + idx}: {e}")
            
            # Update progress
            total_processed += len(chunk_df)
            task.processed = total_processed
            task.save(update_fields=["processed"])

        # Save error file if there are errors
        if errors:
            err_content = "\n".join(errors)
            error_filename = f"attribute_import_errors_{task_id}_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
            task.error_file.save(error_filename, ContentFile(err_content.encode('utf-8')))
            task.status = "partial_success" if total_processed > 0 else "error"
        else:
            task.status = "success"
            
        # Record execution time
        task.execution_time = time.time() - start_time
        task.save(update_fields=["status", "execution_time"])
        
        logger.info(f"Completed attribute import task {task_id}, status: {task.status}, processed: {total_processed}/{total_rows}")
        
    except Exception as e:
        logger.error(f"Error in attribute import task {task_id}: {str(e)}\n{traceback.format_exc()}")
        
        error_content = f"Attribute import failed: {str(e)}"
        error_filename = f"attribute_import_error_{task_id}_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        
        task.error_file.save(error_filename, ContentFile(error_content.encode('utf-8')))
        task.status = "error"
        task.execution_time = time.time() - start_time
        task.save(update_fields=["status", "error_file", "execution_time"])
        
        raise

@shared_task
def import_families_task(task_id: int):
    """
    Import product families from a CSV or Excel file.
    
    Expected columns:
    - code: Unique identifier for the family
    - label_en: English label for the family
    - attribute_codes: Pipe-separated list of attribute codes to include in this family
    """
    task = ImportTask.objects.get(id=task_id)
    task.status = "running"
    task.save(update_fields=["status"])

    start_time = time.time()
    errors = []
    chunk_size = 500

    try:
        # Get file extension to determine format
        file_path = task.csv_file.path
        file_name = task.csv_file.name
        _, file_ext = os.path.splitext(file_name)
        file_ext = file_ext.lower()

        logger.info(f"Starting family import task {task_id} for file {file_name}")

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
            raise ValueError("Column mapping is missing. Please define how columns map to family fields.")
        file_columns = set(df.columns)
        mapped_columns = set(task.mapping.keys())
        missing_columns = mapped_columns - file_columns
        if missing_columns:
            raise ValueError(f"Mapped columns not found in file: {', '.join(missing_columns)}")
        
        # Check required fields
        required = {"code", "label_en", "attribute_codes"}
        dest_cols = set(task.mapping.values())
        if not required.issubset(dest_cols):
            raise ValueError(f"Missing required field mapping: {required - dest_cols}")

        # Prepare for batch processing
        total_rows = len(df)
        task.total_rows = total_rows
        task.save(update_fields=["total_rows"])
        chunks = [df[i:i+chunk_size] for i in range(0, len(df), chunk_size)]
        total_processed = 0

        # Get organization
        org = task.organization
        user = task.created_by

        # Process each chunk
        for chunk_idx, chunk_df in enumerate(chunks):
            logger.debug(f"Processing chunk {chunk_idx+1}/{len(chunks)}")
            chunk_df = chunk_df.replace({np.nan: None})
            
            for idx, row in chunk_df.iterrows():
                try:
                    # Build row dict using mapping
                    mapped_row = {}
                    for field in FAMILY_SCHEMA:
                        field_id = field['id']
                        src = next((k for k, v in task.mapping.items() if v == field_id), None)
                        if src and src in row.index and pd.notna(row[src]):
                            mapped_row[field_id] = row[src]
                        else:
                            mapped_row[field_id] = None
                    
                    # Create or update family
                    family = upsert_family(mapped_row, org, user)
                    logger.debug(f"Processed family: {family.code}")
                    
                except Exception as e:
                    errors.append(f"Row {total_processed + idx}: {e}")
            
            # Update progress
            total_processed += len(chunk_df)
            task.processed = total_processed
            task.save(update_fields=["processed"])

        # Save error file if there are errors
        if errors:
            err_content = "\n".join(errors)
            error_filename = f"family_import_errors_{task_id}_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
            task.error_file.save(error_filename, ContentFile(err_content.encode('utf-8')))
            task.status = "partial_success" if total_processed > 0 else "error"
        else:
            task.status = "success"
            
        # Record execution time
        task.execution_time = time.time() - start_time
        task.save(update_fields=["status", "execution_time"])
        
        logger.info(f"Completed family import task {task_id}, status: {task.status}, processed: {total_processed}/{total_rows}")
        
    except Exception as e:
        logger.error(f"Error in family import task {task_id}: {str(e)}\n{traceback.format_exc()}")
        
        error_content = f"Family import failed: {str(e)}"
        error_filename = f"family_import_error_{task_id}_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        
        task.error_file.save(error_filename, ContentFile(error_content.encode('utf-8')))
        task.status = "error"
        task.execution_time = time.time() - start_time
        task.save(update_fields=["status", "error_file", "execution_time"])
        
        raise

def save_batch(serializers, user, errors):
    """
    Util func: Save a batch of products via serializers, with error collection.
    """
    for idx, serializer in enumerate(serializers):
        try:
            product = serializer.save(created_by=user)
        except Exception as e:
            errors.append(f"Row {idx}: {str(e)}")
    return errors


def save_overwrite_batch(data_list, user, errors):
    """
    Util func: Create or overwrite (skip validation) products with direct Model.objects.update_or_create,
    with error collection.
    """
    for idx, data in enumerate(data_list):
        try:
            org = get_user_organization(user)  # Replicate what serializer would do
            sku = data.pop('sku', None)
            if not sku:
                errors.append(f"Row {idx}: SKU is missing")
                continue
                
            Product.objects.update_or_create(
                organization=org,
                sku=sku,
                defaults={**data, 'created_by': user}
            )
        except Exception as e:
            errors.append(f"Row {idx}: {str(e)}")
    return errors 