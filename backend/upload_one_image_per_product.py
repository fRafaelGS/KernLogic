import os
import django
import glob
import random
import shutil
import time
from pathlib import Path

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from products.models import Product, ProductAsset
from kernlogic.utils import get_user_organization
from products.utils.asset_type_service import asset_type_service

# Path to car images directories
CAR_IMAGES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 
                            'test_data_generation', 'car_products', 'car_images')
SAMPLE_IMAGES_DIR = os.path.join(CAR_IMAGES_DIR, 'sample_images')

# Print the absolute paths for debugging
print(f"Looking for car images in: {CAR_IMAGES_DIR}")
print(f"And in sample images: {SAMPLE_IMAGES_DIR}")

def get_all_image_files():
    """Get all image files from both directories."""
    image_files = []
    
    # Get images from main car_images directory
    for ext in ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif']:
        pattern = os.path.join(CAR_IMAGES_DIR, f'*.{ext}')
        image_files.extend(glob.glob(pattern))
    
    # Get images from sample_images subdirectory
    for ext in ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif']:
        pattern = os.path.join(SAMPLE_IMAGES_DIR, f'*.{ext}')
        image_files.extend(glob.glob(pattern))
    
    return image_files

def main():
    # Get admin user
    User = get_user_model()
    admin = User.objects.filter(is_superuser=True).first()
    
    if not admin:
        print("Error: No admin user found!")
        return
        
    print(f"Using admin user: {admin.email}")
    
    # Get organization
    try:
        organization = get_user_organization(admin)
        if not organization:
            print("Error: No organization found for admin user!")
            return
            
        print(f"Using organization: {organization.name}")
    except Exception as e:
        print(f"Error getting organization: {str(e)}")
        return
    
    # Get all image files
    image_files = get_all_image_files()
    
    if not image_files:
        print(f"Error: No image files found in {CAR_IMAGES_DIR} or {SAMPLE_IMAGES_DIR}")
        return
        
    print(f"Found {len(image_files)} image files")
    
    # Clear existing assets first
    print("Clearing existing product assets...")
    ProductAsset.objects.filter(organization=organization, asset_type='image').delete()
    print("Existing assets cleared.")
    
    # Get all car products
    products = Product.objects.filter(organization=organization)
    print(f"Found {products.count()} products")
    
    if not products.exists():
        print("No products found to associate images with!")
        return
    
    # Ensure we have enough images by cycling through them if needed
    if len(products) > len(image_files):
        print(f"More products ({len(products)}) than images ({len(image_files)}). Some images will be reused.")
    
    # Assign one random image to each product
    products_list = list(products)
    random.shuffle(products_list)  # Randomize product order
    
    success_count = 0
    
    for i, product in enumerate(products_list):
        # Select a random image
        image_index = i % len(image_files)
        image_path = image_files[image_index]
        
        print(f"\nUploading image for product: {product.name} (SKU: {product.sku})")
        
        try:
            # Prepare image file
            with open(image_path, 'rb') as f:
                image_content = f.read()
            
            filename = os.path.basename(image_path)
            
            # Use the centralized asset type service
            detected_type = asset_type_service.detect_type(filename)
            content_type = f"image/{os.path.splitext(filename)[1][1:].lower() or 'jpeg'}" if detected_type == 'image' else 'application/octet-stream'
            
            # Create asset
            asset = ProductAsset(
                product=product,
                asset_type='image',
                name=f"{product.name} - Primary Image",
                order=0,
                is_primary=True,  # Set as primary image
                content_type=content_type,
                file_size=len(image_content),
                uploaded_by=admin,
                organization=organization
            )
            
            # Save file content
            asset.file.save(filename, ContentFile(image_content), save=False)
            asset.save()
            
            print(f"  Uploaded {filename} as primary image")
            success_count += 1
            
            # Short delay to prevent overloading the server
            time.sleep(0.2)
            
        except Exception as e:
            print(f"  Error uploading image {filename}: {str(e)}")
    
    print(f"\nImage upload completed! Successfully uploaded {success_count} images to {len(products_list)} products.")

if __name__ == "__main__":
    main() 