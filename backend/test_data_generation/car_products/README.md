# Car Products Test Data Generator

This directory contains tools for generating and uploading realistic car product test data to the KernLogic platform. These tools are designed to help test various features and functionalities of the platform with a diverse set of realistic product data.

## Features

- Generate 100+ realistic car products with comprehensive attributes using Faker
- Download car images from Unsplash (requires API key) or use provided sample images
- Upload products via the KernLogic API
- Bulk create automotive attribute groups and attributes
- Bulk upload multiple product images to existing products
- Generate CSV files for bulk import

## Requirements

Install the required Python packages:

```bash
pip install faker faker-vehicle requests
```

For image downloading, you will need an Unsplash API key:
1. Sign up at https://unsplash.com/developers
2. Create a new application to get an access key
3. Set it as an environment variable:
   ```bash
   export UNSPLASH_ACCESS_KEY=your_access_key_here
   ```

## Usage

### Quick Start

To generate car products and prepare a CSV file for bulk import:

```bash
python run.py --generate --csv
```

To generate data, download images, and upload everything via API:

```bash
python run.py --all --email your.email@example.com --password yourpassword
```

### Step-by-Step Process for Creating Complete Test Data

We used the following process to create a comprehensive test dataset in KernLogic:

1. **Generate product data with Faker**:
   ```bash
   python run.py --generate --count 100
   ```
   This creates a JSON file with 100 realistic car product entries. The generator uses Faker and faker-vehicle to create realistic car brands, models, years, and other attributes.

2. **Export to CSV format for bulk import**:
   ```bash
   python run.py --csv
   ```
   Creates a CSV file that can be used with KernLogic's bulk import feature.

3. **Import products via KernLogic bulk import**:
   Upload the generated CSV file using the KernLogic UI or via the API. The process handles duplicate detection and data validation.

4. **Create automotive attribute groups and attributes**:
   We created a custom script (`create_car_attributes.py`) to bulk create 10 automotive-specific attribute groups with 58 attributes:
   
   ```bash
   # Run from backend directory
   python create_car_attributes.py
   ```
   
   This script creates structured attribute groups for:
   - Identification (make, model, year, VIN, etc.)
   - Engine & Drivetrain (engine type, horsepower, torque, etc.)
   - Performance (acceleration, top speed, etc.)
   - Dimensions & Weight (length, width, height, etc.)
   - Exterior (body style, number of doors, etc.)
   - Interior (upholstery, screen size, etc.)
   - Safety & Assistance (airbags, ABS, etc.)
   - Infotainment & Connectivity (audio system, bluetooth, etc.)
   - Pricing & Commercial (MSRP, warranty, etc.)
   - Compliance & Certification (safety rating, emissions standard, etc.)

5. **Bulk upload multiple images per product**:
   We created a custom script (`upload_three_images_per_product.py`) to upload multiple images to each product:
   
   ```bash
   # Run from backend directory
   python upload_three_images_per_product.py
   ```
   
   This script:
   - Finds all available car images in the car_images directory
   - Clears existing product assets (if any)
   - Uploads 3 random images to each product
   - Sets the first image as the primary image for each product

### Additional Options

- `--base-url`: API base URL (default: http://localhost:8000/api)
- `--output-dir`: Custom output directory for generated files
- `--skip-missing`: Skip products that don't exist when uploading images

## File Structure

- `run.py`: Main script that orchestrates all functionality
- `generator.py`: Generates realistic car product data using Faker
- `uploader.py`: Uploads products via the API
- `image_manager.py`: Downloads and uploads car images
- `csv_exporter.py`: Generates CSV files for bulk import
- `car_images/`: Directory for storing downloaded or manually added car images
- `car_products.json`: Generated product data
- `car_products_import.csv`: CSV file for bulk import

## Customization

You can customize the product generation by editing `generator.py`:

- `CAR_CATEGORIES`: List of car categories
- `CAR_TAGS`: Available tags for products
- `CAR_ATTRIBUTES`: Attribute templates and possible values

## Additional Scripts

Several utility scripts were created to manage the test data:

- `create_car_attributes.py`: Creates automotive attribute groups and attributes
- `upload_one_image_per_product.py`: Uploads one random image to each product
- `upload_three_images_per_product.py`: Uploads three random images to each product

## Troubleshooting

- **Authentication issues**: Ensure your email and password are correct and the user has appropriate permissions.
- **Missing images**: If you don't have an Unsplash API key, use the provided sample images in `car_images/` directory.
- **API connection errors**: Check that the API server is running and accessible at the specified URL.
- **Import errors**: Review any error messages during CSV import in the KernLogic UI.
- **Celery worker issues**: If bulk imports remain in "queued" status, ensure Celery workers are running: `celery -A core worker --loglevel=info` 