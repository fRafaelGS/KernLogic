import os
import json
import requests
import argparse
from pathlib import Path
import time
import random

def download_car_images(count=30, output_dir=None):
    """
    Download car images from Unsplash API for use as product images.
    
    Note: Requires an Unsplash API access key.
    """
    if output_dir is None:
        output_dir = os.path.join(os.path.dirname(__file__), "car_images")
    
    # Create the output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    access_key = os.environ.get("UNSPLASH_ACCESS_KEY")
    if not access_key:
        print("Warning: UNSPLASH_ACCESS_KEY environment variable not set.")
        print("Will use placeholder reference to sample car images instead.")
        
        # Create a README file with instructions
        with open(os.path.join(output_dir, "README.md"), "w") as f:
            f.write("""# Car Images Directory

This directory should contain car images to be used for product uploads.

To download real images, you need an Unsplash API access key:
1. Get an API key from https://unsplash.com/developers
2. Set it as an environment variable: `export UNSPLASH_ACCESS_KEY=your_key_here`
3. Run the image_manager.py script: `python image_manager.py --download`

Alternatively, place your car images in this directory manually, naming them car_1.jpg, car_2.jpg, etc.
""")
        return []
    
    # Unsplash API endpoint for car photos
    url = "https://api.unsplash.com/search/photos"
    headers = {"Authorization": f"Client-ID {access_key}"}
    
    # Get a mix of different car types
    car_types = ["car", "sports car", "luxury car", "suv", "truck", "convertible"]
    
    all_downloaded_files = []
    per_query = max(5, count // len(car_types) + 1)  # Ensure we get enough images
    
    for car_type in car_types:
        params = {
            "query": car_type,
            "orientation": "landscape",
            "per_page": per_query
        }
        
        try:
            response = requests.get(url, headers=headers, params=params)
            response.raise_for_status()
            data = response.json()
            
            # Download each image
            for idx, photo in enumerate(data["results"]):
                if len(all_downloaded_files) >= count:
                    break
                    
                img_url = photo["urls"]["regular"]
                img_id = photo["id"]
                file_ext = "jpg"  # Unsplash images are typically JPG
                
                # Construct filename and path
                img_count = len(all_downloaded_files) + 1
                filename = f"car_{img_count}.{file_ext}"
                filepath = os.path.join(output_dir, filename)
                
                # Download the image
                try:
                    img_response = requests.get(img_url)
                    img_response.raise_for_status()
                    
                    with open(filepath, "wb") as img_file:
                        img_file.write(img_response.content)
                    
                    print(f"Downloaded {filename}")
                    all_downloaded_files.append(filepath)
                    
                    # Be nice to the API - add a small delay
                    time.sleep(0.5)
                    
                except Exception as e:
                    print(f"Error downloading {img_url}: {str(e)}")
            
            # If we have enough images, break out of the loop
            if len(all_downloaded_files) >= count:
                break
                
        except Exception as e:
            print(f"Error querying Unsplash API for '{car_type}': {str(e)}")
    
    print(f"Downloaded {len(all_downloaded_files)} car images to {output_dir}")
    return all_downloaded_files

def upload_product_images(base_url, token, skip_missing=False):
    """
    Upload images to products that have already been created in the system.
    
    Args:
        base_url: Base URL for the API
        token: JWT token for authentication
        skip_missing: If True, skip products that don't exist instead of failing
    """
    # Get list of local car images
    image_dir = os.path.join(os.path.dirname(__file__), "car_images")
    if not os.path.exists(image_dir):
        print(f"Image directory {image_dir} not found!")
        return
    
    # Find image files
    image_files = []
    for file in os.listdir(image_dir):
        if file.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
            image_files.append(os.path.join(image_dir, file))
    
    if not image_files:
        print(f"No image files found in {image_dir}")
        return
    
    print(f"Found {len(image_files)} image files")
    
    # Load product data to get SKUs
    products_file = os.path.join(os.path.dirname(__file__), "car_products.json")
    if not os.path.exists(products_file):
        print(f"Products file {products_file} not found!")
        return
    
    with open(products_file, 'r') as f:
        products = json.load(f)
    
    print(f"Loaded {len(products)} products from {products_file}")
    
    # Prepare for API calls
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    successful = 0
    failed = 0
    
    for idx, product in enumerate(products):
        try:
            # 1. Find product by SKU
            sku = product["sku"]
            print(f"Processing product {idx+1}/{len(products)}: {sku}")
            
            response = requests.get(f"{base_url}/products/?search={sku}", headers=headers)
            response.raise_for_status()
            data = response.json()
            
            if not data.get("results") or len(data["results"]) == 0:
                print(f"  ⚠️ Product not found with SKU: {sku}")
                if skip_missing:
                    continue
                else:
                    raise Exception(f"Product not found with SKU: {sku}")
            
            product_id = data["results"][0]["id"]
            
            # 2. Select image file
            image_file = image_files[idx % len(image_files)]
            
            # 3. Upload the image
            with open(image_file, "rb") as img:
                files = {"file": img}
                response = requests.post(
                    f"{base_url}/products/{product_id}/assets/",
                    files=files,
                    data={"asset_type": "image", "is_primary": True},
                    headers=headers
                )
                response.raise_for_status()
            
            print(f"  ✅ Uploaded image {os.path.basename(image_file)}")
            successful += 1
            
            # 4. Delay to avoid overwhelming the server
            time.sleep(0.5)
            
        except Exception as e:
            failed += 1
            print(f"  ❌ Failed: {str(e)}")
    
    print(f"\nImage upload summary: {successful} successful, {failed} failed")

def get_token(base_url, email, password):
    """Obtain JWT token for authentication."""
    url = f"{base_url}/token/"
    payload = {
        "email": email,
        "password": password
    }
    
    try:
        response = requests.post(url, json=payload)
        response.raise_for_status()
        return response.json()["access"]
    except Exception as e:
        print(f"Authentication failed: {str(e)}")
        if hasattr(response, 'text'):
            print(f"Response: {response.text}")
        return None

def main():
    parser = argparse.ArgumentParser(description='Manage car product images')
    parser.add_argument('--download', action='store_true', help='Download car images from Unsplash')
    parser.add_argument('--upload', action='store_true', help='Upload images to products')
    parser.add_argument('--base-url', default='http://localhost:8000/api', help='Base URL for the API')
    parser.add_argument('--email', help='Email for authentication')
    parser.add_argument('--password', help='Password for authentication')
    parser.add_argument('--image-count', type=int, default=30, help='Number of images to download')
    parser.add_argument('--skip-missing', action='store_true', help='Skip products that don\'t exist')
    
    args = parser.parse_args()
    
    if args.download:
        download_car_images(args.image_count)
    
    if args.upload:
        if not args.email or not args.password:
            print("Error: Email and password are required for uploading images")
            return
        
        token = get_token(args.base_url, args.email, args.password)
        if not token:
            return
        
        upload_product_images(args.base_url, token, args.skip_missing)

if __name__ == "__main__":
    main() 