import os
import json
import csv
import argparse

def generate_csv_import(products, filename=None):
    """
    Generate a CSV file for bulk import of products.
    
    Args:
        products: List of product data dictionaries
        filename: Output filename, defaults to "car_products_import.csv"
    
    Returns:
        Path to the generated CSV file
    """
    if filename is None:
        filename = "car_products_import.csv"
    
    output_path = os.path.join(os.path.dirname(__file__), filename)
    
    # Determine all possible attribute fields to create columns
    attribute_fields = set()
    for product in products:
        for key in product.get("attributes", {}).keys():
            attribute_fields.add(f"attribute_{key}")
    
    # Create header row with base fields and attribute fields
    fieldnames = [
        "name", "sku", "description", "price", "category", 
        "brand", "barcode", "tags", "is_active"
    ] + sorted(list(attribute_fields))
    
    with open(output_path, "w", newline="") as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        
        for product in products:
            # Convert tags list to JSON array string instead of comma-separated
            tags_json = json.dumps(product.get("tags", []))
            
            row = {
                "name": product.get("name", ""),
                "sku": product.get("sku", ""),
                "description": product.get("description", ""),
                "price": product.get("price", 0),
                "category": product.get("category", ""),
                "brand": product.get("brand", ""),
                "barcode": product.get("barcode", ""),
                "tags": tags_json,
                "is_active": "true" if product.get("is_active", True) else "false"
            }
            
            # Add attribute fields
            for key, value in product.get("attributes", {}).items():
                row[f"attribute_{key}"] = value
                
            writer.writerow(row)
    
    print(f"Generated CSV import file: {output_path}")
    return output_path

def main():
    parser = argparse.ArgumentParser(description='Generate CSV file for bulk import of car products')
    parser.add_argument('--input-file', default='car_products.json', help='JSON file with product data')
    parser.add_argument('--output-file', default='car_products_import.csv', help='Output CSV filename')
    
    args = parser.parse_args()
    
    # Load products from JSON file
    input_path = os.path.join(os.path.dirname(__file__), args.input_file)
    if not os.path.exists(input_path):
        print(f"Input file {input_path} not found!")
        return
    
    with open(input_path, 'r') as f:
        products = json.load(f)
    
    print(f"Loaded {len(products)} products from {input_path}")
    
    # Generate CSV for import
    generate_csv_import(products, args.output_file)

if __name__ == "__main__":
    main() 