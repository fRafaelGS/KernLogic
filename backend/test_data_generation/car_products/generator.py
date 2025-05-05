import os
import json
import random
import requests
from faker import Faker
from faker_vehicle import VehicleProvider

# Setup faker with vehicle provider
fake = Faker()
fake.add_provider(VehicleProvider)

# Car categories
CAR_CATEGORIES = [
    "Sedan", "SUV", "Truck", "Convertible", "Coupe", 
    "Hatchback", "Wagon", "Van", "Luxury", "Hybrid", "Electric"
]

# Car-related tags
CAR_TAGS = [
    "Automatic", "Manual", "AWD", "FWD", "RWD", "Leather", "Sunroof",
    "Navigation", "Bluetooth", "Backup Camera", "Heated Seats", "Family",
    "Offroad", "Sport", "Premium", "Economy", "Compact", "Midsize", "Fullsize"
]

# Common attribute templates for cars
CAR_ATTRIBUTES = {
    "engine": ["1.4L Inline-4", "1.6L Inline-4", "2.0L Inline-4", "2.5L Inline-4", 
               "3.0L V6", "3.5L V6", "4.0L V8", "5.0L V8", "Electric"],
    "transmission": ["5-Speed Manual", "6-Speed Manual", "6-Speed Automatic", 
                     "7-Speed Automatic", "8-Speed Automatic", "CVT", "Dual-Clutch"],
    "drivetrain": ["FWD", "RWD", "AWD", "4WD"],
    "fuel_economy_city": range(12, 45),  # mpg
    "fuel_economy_highway": range(18, 55),  # mpg
    "seating_capacity": [2, 4, 5, 6, 7, 8],
    "cargo_space": range(10, 100),  # cubic feet
    "horsepower": range(85, 700),
    "torque": range(90, 650),  # lb-ft
    "ground_clearance": range(4, 12),  # inches
    "wheel_size": ["16\"", "17\"", "18\"", "19\"", "20\"", "21\"", "22\""],
    "warranty": ["3-year/36,000 miles", "5-year/60,000 miles", "10-year/100,000 miles"],
    "safety_rating": ["5-Star", "4-Star", "3-Star"]
}

def generate_car_products(count=100):
    """Generate realistic car product data."""
    products = []
    
    for i in range(1, count + 1):
        # Generate base vehicle data
        year = random.randint(2018, 2023)
        make = fake.vehicle_make()
        model = fake.vehicle_model()
        
        # Create a realistic name and SKU
        name = f"{year} {make} {model}"
        sku = f"{make[:3].upper()}-{model[:3].upper()}-{year}-{i:03d}"
        
        # Generate category, tags and images based on vehicle type
        category = random.choice(CAR_CATEGORIES)
        
        # Select 2-5 random tags
        tags = random.sample(CAR_TAGS, random.randint(2, 5))
        
        # Generate price based on category and make
        base_price = 0
        if category in ["Luxury", "Electric", "Hybrid"]:
            base_price = random.randint(40000, 90000)
        elif category in ["SUV", "Truck"]:
            base_price = random.randint(25000, 60000)
        else:
            base_price = random.randint(18000, 45000)
            
        # Adjust price by make
        luxury_brands = ["BMW", "Mercedes-Benz", "Audi", "Lexus", "Porsche", "Tesla"]
        if make in luxury_brands:
            base_price *= 1.3
            
        price = round(base_price * (0.9 + random.random() * 0.2), 2)  # Add some variance
        
        # Generate barcode
        barcode = fake.ean13()
        
        # Generate detailed description
        description = f"The {year} {make} {model} is a {category.lower()} vehicle "
        description += f"that combines style, performance, and reliability. "
        
        # Add some random features to description
        features = random.sample([
            "advanced safety features", "premium sound system", "spacious interior",
            "fuel efficiency", "powerful engine", "sleek design", "cutting-edge technology",
            "all-weather capability", "comfortable seating", "ample cargo space", 
            "responsive handling", "quiet cabin", "panoramic sunroof", "heated seats"
        ], 4)
        
        description += f"This model is known for its {', '.join(features[:-1])} and {features[-1]}. "
        description += f"Perfect for {random.choice(['families', 'commuters', 'adventure seekers', 'professionals'])}."
        
        # Generate detailed attributes
        attributes = {}
        for attr_name, attr_values in CAR_ATTRIBUTES.items():
            if attr_name in ["fuel_economy_city", "fuel_economy_highway", "cargo_space", "horsepower", "torque", "ground_clearance"]:
                attributes[attr_name] = random.choice(attr_values)
            else:
                attributes[attr_name] = random.choice(attr_values)
        
        # Special case for electric vehicles
        if category == "Electric":
            attributes["engine"] = "Electric Motor"
            attributes["range"] = f"{random.randint(200, 400)} miles"
            attributes.pop("fuel_economy_city", None)
            attributes.pop("fuel_economy_highway", None)
        
        # Create the product object
        product = {
            "name": name,
            "sku": sku,
            "description": description,
            "price": price,
            "category": category,
            "brand": make,
            "barcode": barcode,
            "tags": tags,
            "attributes": attributes,
            "is_active": True,
            "is_archived": False
        }
        
        products.append(product)
    
    return products

def save_products_to_json(products, output_file="car_products.json"):
    """Save the generated products to a JSON file."""
    output_path = os.path.join(os.path.dirname(__file__), output_file)
    with open(output_path, "w") as f:
        json.dump(products, f, indent=2)
    
    print(f"Generated {len(products)} car products and saved to {output_path}")
    return output_path

if __name__ == "__main__":
    # Generate and save 100 car products
    products = generate_car_products(100)
    save_products_to_json(products) 