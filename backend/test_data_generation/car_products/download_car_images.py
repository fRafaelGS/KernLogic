import os
import requests
import time
from pathlib import Path

# Define the car images directory
CAR_IMAGES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'car_images')

# Create the directory if it doesn't exist
os.makedirs(CAR_IMAGES_DIR, exist_ok=True)

# List of publicly accessible car image URLs
CAR_IMAGE_URLS = [
    "https://i.imgur.com/XgbZdeA.jpg",  # Sports Car
    "https://i.imgur.com/8tgvr0P.jpg",  # Luxury Sedan
    "https://i.imgur.com/kQZ0UaC.jpg",  # SUV
    "https://i.imgur.com/IzKQEDb.jpg",  # Convertible
    "https://i.imgur.com/rqBCbSW.jpg",  # Truck
    "https://i.imgur.com/YyLXWGT.jpg",  # Muscle Car
    "https://i.imgur.com/gzviKXj.jpg",  # Electric Car
    "https://i.imgur.com/a79YifX.jpg",  # Classic Car
    "https://i.imgur.com/5tYPsIF.jpg",  # Luxury SUV
    "https://i.imgur.com/6bN0eGh.jpg",  # Race Car
    "https://i.imgur.com/xOSPMnL.jpg",  # Vintage Car
    "https://i.imgur.com/mJVx02j.jpg",  # Offroad Truck
]

def download_image(url, filename):
    """Download an image from a URL and save it to the specified filename."""
    try:
        response = requests.get(url, stream=True, timeout=10)
        response.raise_for_status()
        
        with open(filename, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
                
        print(f"Downloaded: {filename}")
        return True
    except Exception as e:
        print(f"Error downloading {url}: {str(e)}")
        return False

def main():
    """Download car images from public URLs."""
    print(f"Downloading car images to: {CAR_IMAGES_DIR}")
    
    successful_downloads = 0
    
    for i, url in enumerate(CAR_IMAGE_URLS):
        # Create a filename for each image
        filename = os.path.join(CAR_IMAGES_DIR, f"car_{i+1}.jpg")
        
        # Download the image
        if download_image(url, filename):
            successful_downloads += 1
        
        # Sleep a bit to be nice to the server
        time.sleep(0.5)
    
    print(f"\nDownloaded {successful_downloads} car images out of {len(CAR_IMAGE_URLS)} attempted.")

if __name__ == "__main__":
    main() 