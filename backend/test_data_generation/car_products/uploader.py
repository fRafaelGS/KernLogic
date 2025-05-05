import os
import json
import requests
import argparse
from pathlib import Path

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

def upload_products(products, base_url, token):
    """Upload products to the API."""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    successful = 0
    failed = 0
    failures = []
    
    for idx, product in enumerate(products, 1):
        try:
            print(f"Uploading product {idx}/{len(products)}: {product['name']} (SKU: {product['sku']})")
            response = requests.post(f"{base_url}/products/", json=product, headers=headers)
            response.raise_for_status()
            successful += 1
            print(f"✅ Success!")
        except Exception as e:
            failed += 1
            error_msg = str(e)
            if hasattr(response, 'text'):
                error_msg += f" - {response.text}"
            failures.append({
                "sku": product["sku"],
                "error": error_msg
            })
            print(f"❌ Failed: {error_msg}")
    
    print(f"\nUpload summary: {successful} successful, {failed} failed")
    if failures:
        print("Failed products:")
        for failure in failures:
            print(f"  - SKU: {failure['sku']}, Error: {failure['error']}")
    
    return successful, failed, failures

def save_failures(failures, output_file="failed_uploads.json"):
    """Save failed uploads to a JSON file for retry."""
    output_path = os.path.join(os.path.dirname(__file__), output_file)
    with open(output_path, "w") as f:
        json.dump(failures, f, indent=2)
    
    if failures:
        print(f"Saved {len(failures)} failed uploads to {output_path}")

def main():
    parser = argparse.ArgumentParser(description='Upload car products to KernLogic API')
    parser.add_argument('--base-url', default='http://localhost:8000/api', help='Base URL for the API')
    parser.add_argument('--email', required=True, help='Email for authentication')
    parser.add_argument('--password', required=True, help='Password for authentication')
    parser.add_argument('--input-file', default='car_products.json', help='JSON file with products to upload')
    parser.add_argument('--count', type=int, default=None, help='Number of products to upload (default: all)')
    
    args = parser.parse_args()
    
    # Load products from JSON file
    input_path = os.path.join(os.path.dirname(__file__), args.input_file)
    if not os.path.exists(input_path):
        print(f"Input file {input_path} not found!")
        return
    
    with open(input_path, 'r') as f:
        products = json.load(f)
    
    if args.count is not None:
        products = products[:args.count]
    
    print(f"Loaded {len(products)} products from {input_path}")
    
    # Get authentication token
    token = get_token(args.base_url, args.email, args.password)
    if not token:
        return
    
    # Upload products
    _, _, failures = upload_products(products, args.base_url, token)
    
    # Save failures for retry
    save_failures(failures)

if __name__ == "__main__":
    main() 