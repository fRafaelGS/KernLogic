import os
import django
import json
import time

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
from products.models import Attribute, AttributeGroup, AttributeGroupItem
from kernlogic.utils import get_user_organization

# Define attribute data types
TEXT = 'text'
NUMBER = 'number'
BOOLEAN = 'boolean'
DATE = 'date'
SELECT = 'select'

# Define attribute groups and their attributes
CAR_ATTRIBUTE_GROUPS = [
    {
        "name": "Identification",
        "order": 1,
        "attributes": [
            {"code": "make", "label": "Make", "data_type": TEXT},
            {"code": "model", "label": "Model", "data_type": TEXT},
            {"code": "trim", "label": "Trim", "data_type": TEXT},
            {"code": "year", "label": "Year", "data_type": NUMBER},
            {"code": "vin", "label": "VIN", "data_type": TEXT},
            {"code": "internal_code", "label": "SKU / Internal Code", "data_type": TEXT},
        ]
    },
    {
        "name": "Engine & Drivetrain",
        "order": 2,
        "attributes": [
            {"code": "engine_type", "label": "Engine Type", "data_type": TEXT},
            {"code": "displacement", "label": "Displacement (L)", "data_type": NUMBER},
            {"code": "horsepower", "label": "Horsepower (hp)", "data_type": NUMBER},
            {"code": "torque", "label": "Torque (Nm)", "data_type": NUMBER},
            {"code": "transmission", "label": "Transmission", "data_type": TEXT},
            {"code": "drive_type", "label": "Drive Type", "data_type": SELECT},
            {"code": "fuel_type", "label": "Fuel Type", "data_type": SELECT},
        ]
    },
    {
        "name": "Performance",
        "order": 3,
        "attributes": [
            {"code": "acceleration", "label": "0–100 km/h (s)", "data_type": NUMBER},
            {"code": "top_speed", "label": "Top Speed (km/h)", "data_type": NUMBER},
            {"code": "fuel_consumption", "label": "Fuel Consumption (L/100 km)", "data_type": NUMBER},
            {"code": "co2_emissions", "label": "CO₂ Emissions (g/km)", "data_type": NUMBER},
        ]
    },
    {
        "name": "Dimensions & Weight",
        "order": 4,
        "attributes": [
            {"code": "length", "label": "Length (mm)", "data_type": NUMBER},
            {"code": "width", "label": "Width (mm)", "data_type": NUMBER},
            {"code": "height", "label": "Height (mm)", "data_type": NUMBER},
            {"code": "wheelbase", "label": "Wheelbase (mm)", "data_type": NUMBER},
            {"code": "curb_weight", "label": "Curb Weight (kg)", "data_type": NUMBER},
            {"code": "gvwr", "label": "Gross Vehicle Weight Rating (kg)", "data_type": NUMBER},
            {"code": "cargo_volume", "label": "Cargo Volume (L)", "data_type": NUMBER},
        ]
    },
    {
        "name": "Exterior",
        "order": 5,
        "attributes": [
            {"code": "body_style", "label": "Body Style", "data_type": SELECT},
            {"code": "num_doors", "label": "Number of Doors", "data_type": NUMBER},
            {"code": "num_seats", "label": "Number of Seats", "data_type": NUMBER},
            {"code": "exterior_color", "label": "Exterior Color", "data_type": TEXT},
            {"code": "wheel_size", "label": "Wheel Size (inches)", "data_type": NUMBER},
            {"code": "tire_type", "label": "Tire Type", "data_type": SELECT},
        ]
    },
    {
        "name": "Interior",
        "order": 6,
        "attributes": [
            {"code": "upholstery", "label": "Upholstery Material", "data_type": SELECT},
            {"code": "seat_config", "label": "Seat Configuration", "data_type": TEXT},
            {"code": "screen_size", "label": "Infotainment Screen Size (inches)", "data_type": NUMBER},
            {"code": "climate_control", "label": "Climate Control", "data_type": SELECT},
            {"code": "seats_adjust", "label": "Adjustable Seats", "data_type": SELECT},
        ]
    },
    {
        "name": "Safety & Assistance",
        "order": 7,
        "attributes": [
            {"code": "airbags", "label": "Airbags", "data_type": TEXT},
            {"code": "abs", "label": "ABS", "data_type": BOOLEAN},
            {"code": "traction_control", "label": "Traction Control", "data_type": BOOLEAN},
            {"code": "lane_keeping", "label": "Lane-Keeping Assist", "data_type": BOOLEAN},
            {"code": "parking_sensors", "label": "Parking Sensors", "data_type": SELECT},
            {"code": "adaptive_cruise", "label": "Adaptive Cruise Control", "data_type": BOOLEAN},
        ]
    },
    {
        "name": "Infotainment & Connectivity",
        "order": 8,
        "attributes": [
            {"code": "audio_system", "label": "Audio System", "data_type": TEXT},
            {"code": "smartphone_integration", "label": "Smartphone Integration", "data_type": TEXT},
            {"code": "bluetooth", "label": "Bluetooth", "data_type": TEXT},
            {"code": "wifi_hotspot", "label": "Wi-Fi Hotspot", "data_type": BOOLEAN},
            {"code": "navigation", "label": "Navigation", "data_type": SELECT},
        ]
    },
    {
        "name": "Pricing & Commercial",
        "order": 9,
        "attributes": [
            {"code": "msrp", "label": "MSRP", "data_type": NUMBER},
            {"code": "invoice_price", "label": "Invoice Price", "data_type": NUMBER},
            {"code": "warranty", "label": "Warranty", "data_type": TEXT},
            {"code": "availability", "label": "Availability Status", "data_type": SELECT},
        ]
    },
    {
        "name": "Compliance & Certification",
        "order": 10,
        "attributes": [
            {"code": "safety_rating", "label": "Safety Rating", "data_type": NUMBER},
            {"code": "emissions_standard", "label": "Emissions Standard", "data_type": TEXT},
            {"code": "homologation_markets", "label": "Homologation Markets", "data_type": TEXT},
        ]
    }
]

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
    
    attribute_map = {}  # To store attributes by code for later reference
    
    # Process each attribute group
    for group_data in CAR_ATTRIBUTE_GROUPS:
        print(f"\nProcessing attribute group: {group_data['name']}")
        
        # First create all attributes for this group
        for attr_data in group_data["attributes"]:
            code = attr_data["code"]
            label = attr_data["label"]
            data_type = attr_data["data_type"]
            
            # Check if attribute with this code already exists in this org
            existing_attr = Attribute.objects.filter(
                organization=organization, 
                code=code
            ).first()
            
            if existing_attr:
                print(f"  Attribute already exists: {code} - {label}")
                attribute_map[code] = existing_attr
            else:
                # Create attribute
                try:
                    attr = Attribute.objects.create(
                        organization=organization,
                        created_by=admin,
                        code=code,
                        label=label,
                        data_type=data_type,
                        is_localisable=False,
                        is_scopable=False
                    )
                    attribute_map[code] = attr
                    print(f"  Created attribute: {code} - {label}")
                except Exception as e:
                    print(f"  Error creating attribute {code}: {str(e)}")
        
        # Now create the attribute group
        existing_group = AttributeGroup.objects.filter(
            name=group_data["name"],
            organization=organization
        ).first()
        
        if existing_group:
            print(f"Attribute group already exists: {group_data['name']}")
            group = existing_group
        else:
            try:
                group = AttributeGroup.objects.create(
                    name=group_data["name"],
                    order=group_data["order"],
                    organization=organization,
                    created_by=admin
                )
                print(f"Created attribute group: {group_data['name']}")
            except Exception as e:
                print(f"Error creating attribute group {group_data['name']}: {str(e)}")
                continue
        
        # Add attributes to the group
        for idx, attr_data in enumerate(group_data["attributes"]):
            code = attr_data["code"]
            if code in attribute_map:
                attr = attribute_map[code]
                
                # Check if attribute is already in the group
                existing_item = AttributeGroupItem.objects.filter(
                    group=group,
                    attribute=attr
                ).first()
                
                if existing_item:
                    print(f"  Attribute {code} already in group {group.name}")
                else:
                    try:
                        AttributeGroupItem.objects.create(
                            group=group,
                            attribute=attr,
                            order=idx
                        )
                        print(f"  Added attribute {code} to group {group.name}")
                    except Exception as e:
                        print(f"  Error adding attribute {code} to group: {str(e)}")
    
    print("\nAttribute and group creation completed!")

if __name__ == "__main__":
    main() 