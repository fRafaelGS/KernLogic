#!/usr/bin/env python3
"""
KernLogic Car Products Test Data Generator and Uploader

This script orchestrates the generation and uploading of car product test data.
It provides a simple command-line interface to:
1. Generate car product data with Faker
2. Download car images from Unsplash (or use placeholder instructions)
3. Upload products via API
4. Upload product images
5. Generate CSV for bulk import

Usage examples:
  # Generate data only
  python run.py --generate --count 100
  
  # Generate data and prepare CSV
  python run.py --generate --csv
  
  # Upload via API
  python run.py --upload --email admin@example.com --password secret
  
  # Download images and upload them to existing products
  python run.py --images --upload-images --email admin@example.com --password secret
  
  # Do everything
  python run.py --all --email admin@example.com --password secret
"""

import os
import argparse
import time

from generator import generate_car_products, save_products_to_json
from uploader import get_token, upload_products
from image_manager import download_car_images, upload_product_images
from csv_exporter import generate_csv_import

def main():
    parser = argparse.ArgumentParser(
        description='KernLogic Car Products Test Data Generator and Uploader',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    
    # Define action groups
    action_group = parser.add_argument_group('Actions')
    action_group.add_argument('--all', action='store_true', help='Do everything: generate, download images, upload')
    action_group.add_argument('--generate', action='store_true', help='Generate car product data')
    action_group.add_argument('--upload', action='store_true', help='Upload products via API')
    action_group.add_argument('--images', action='store_true', help='Download car images')
    action_group.add_argument('--upload-images', action='store_true', help='Upload images to existing products')
    action_group.add_argument('--csv', action='store_true', help='Generate CSV for bulk import')
    
    # Define options
    options_group = parser.add_argument_group('Options')
    options_group.add_argument('--count', type=int, default=100, help='Number of products to generate')
    options_group.add_argument('--email', help='Email for API authentication')
    options_group.add_argument('--password', help='Password for API authentication')
    options_group.add_argument('--base-url', default='http://localhost:8000/api', help='Base URL for the API')
    options_group.add_argument('--image-count', type=int, default=30, help='Number of images to download')
    options_group.add_argument('--output-dir', default=None, help='Output directory for files')
    options_group.add_argument('--skip-missing', action='store_true', help='Skip products that don\'t exist when uploading images')
    
    args = parser.parse_args()
    
    # If no action is specified, show help
    if not (args.all or args.generate or args.upload or args.images or args.upload_images or args.csv):
        parser.print_help()
        return
    
    # Define output paths
    output_dir = args.output_dir or os.path.dirname(os.path.abspath(__file__))
    products_file = os.path.join(output_dir, "car_products.json")
    csv_file = os.path.join(output_dir, "car_products_import.csv")
    
    # Execute requested actions
    token = None
    products = None
    
    # Handle --all flag
    if args.all:
        args.generate = True
        args.images = True
        args.upload = True
        args.upload_images = True
        args.csv = True
    
    # Generate products
    if args.generate:
        print("\n== Generating Car Products ==")
        products = generate_car_products(args.count)
        save_products_to_json(products, products_file)
    
    # Download images
    if args.images:
        print("\n== Downloading Car Images ==")
        download_car_images(args.image_count)
    
    # Check authentication for API actions
    if (args.upload or args.upload_images) and (not args.email or not args.password):
        print("\nError: Email and password are required for API operations")
        print("Use --email and --password options, or run with --help for more information")
        return
    
    # Get API token if needed
    if args.upload or args.upload_images:
        token = get_token(args.base_url, args.email, args.password)
        if not token:
            print("\nFailed to get API token. Aborting API operations.")
            # Continue with non-API operations if requested
            if not (args.generate or args.images or args.csv):
                return
    
    # Upload products via API
    if args.upload:
        print("\n== Uploading Products via API ==")
        
        # Load products if not already loaded
        if products is None:
            try:
                with open(products_file, 'r') as f:
                    import json
                    products = json.load(f)
            except Exception as e:
                print(f"Error loading products from {products_file}: {str(e)}")
                print("Generate products first with --generate")
                return
        
        upload_products(products, args.base_url, token)
        
        # Wait a moment before uploading images to allow server processing
        if args.upload_images:
            print("\nWaiting 5 seconds before uploading images...")
            time.sleep(5)
    
    # Upload images to existing products
    if args.upload_images:
        print("\n== Uploading Product Images ==")
        upload_product_images(args.base_url, token, args.skip_missing)
    
    # Generate CSV for bulk import
    if args.csv:
        print("\n== Generating CSV for Bulk Import ==")
        
        # Load products if not already loaded
        if products is None:
            try:
                with open(products_file, 'r') as f:
                    import json
                    products = json.load(f)
            except Exception as e:
                print(f"Error loading products from {products_file}: {str(e)}")
                print("Generate products first with --generate")
                return
        
        generate_csv_import(products, csv_file)
    
    print("\n== Completed All Requested Actions ==")

if __name__ == "__main__":
    main() 