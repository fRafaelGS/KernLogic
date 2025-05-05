import os
import django
import time
import glob
import random
from pathlib import Path

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from products.models import Product, ProductAsset
from kernlogic.utils import get_user_organization

# Path to car images - fixed to use the correct path
CAR_IMAGES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 
                            'test_data_generation', 'car_products', 'car_images')

# Print the absolute path for debugging
print(f"Looking for car images in: {CAR_IMAGES_DIR}")

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
    
    # Check if car images directory exists
    if not os.path.exists(CAR_IMAGES_DIR):
        print(f"Error: Car images directory not found: {CAR_IMAGES_DIR}")
        return
        
    # Get all car image files
    image_files = []
    for ext in ['jpg', 'jpeg', 'png', 'gif']:
        pattern = os.path.join(CAR_IMAGES_DIR, f'*.{ext}')
        image_files.extend(glob.glob(pattern))
        
    if not image_files:
        print(f"Error: No image files found in {CAR_IMAGES_DIR}")
        return
        
    print(f"Found {len(image_files)} image files")
    
    # Get all car products
    products = Product.objects.filter(organization=organization)
    print(f"Found {products.count()} products")
    
    if not products.exists():
        print("No products found to associate images with!")
        return
    
    # Upload images for each product
    for product in products:
        # Randomly select 1-3 images for each product
        num_images = min(random.randint(1, 3), len(image_files))
        selected_images = random.sample(image_files, num_images)
        
        print(f"\nUploading {num_images} images for product: {product.name} (SKU: {product.sku})")
        
        # Upload each selected image
        for i, image_path in enumerate(selected_images):
            try:
                # Prepare image file
                with open(image_path, 'rb') as f:
                    image_content = f.read()
                
                filename = os.path.basename(image_path)
                
                # Create asset
                asset = ProductAsset(
                    product=product,
                    asset_type='image',
                    name=f"{product.name} - Image {i+1}",
                    order=i,
                    is_primary=(i == 0),  # First image is primary
                    content_type=f"image/{os.path.splitext(filename)[1][1:].lower()}",
                    file_size=len(image_content),
                    uploaded_by=admin,
                    organization=organization
                )
                
                # Save file content
                asset.file.save(filename, ContentFile(image_content), save=False)
                asset.save()
                
                print(f"  Uploaded {filename} as {'primary' if i == 0 else 'secondary'} image")
                
                # Short delay to prevent overloading the server
                time.sleep(0.2)
                
            except Exception as e:
                print(f"  Error uploading image {filename}: {str(e)}")
    
    print("\nImage upload completed!")

if __name__ == "__main__":
    main() 