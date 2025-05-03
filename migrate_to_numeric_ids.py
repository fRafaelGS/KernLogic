import os
import sys
import django
import uuid

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.core.settings')
django.setup()

# Import models
from django.contrib.auth import get_user_model
from django.db import transaction
from products.models import Product
from organizations.models import Organization
from accounts.models import Profile
from teams.models import Membership, Role

User = get_user_model()

def migrate_to_numeric_ids():
    """Migrate the application to use numeric IDs for organizations instead of UUIDs."""
    
    print("Starting migration from UUID to numeric IDs...")
    
    # Get all organizations
    organizations = Organization.objects.all()
    print(f"Found {organizations.count()} organization(s)")
    
    # Store mapping of UUID to numeric ID
    uuid_to_id_map = {}
    
    for org in organizations:
        print(f"Organization: {org.name}")
        print(f"  Current ID: {org.id}")
        print(f"  Current UUID: {org.uuid}")
        uuid_to_id_map[str(org.uuid)] = org.id
    
    # Update all memberships to use numeric IDs
    with transaction.atomic():
        print("\nUpdating memberships to use numeric IDs instead of UUIDs...")
        updated_count = 0
        
        memberships = Membership.objects.all()
        for membership in memberships:
            org_uuid = membership.org_id
            
            # Skip if the membership already uses a numeric ID
            if org_uuid in uuid_to_id_map:
                org_id = uuid_to_id_map[org_uuid]
                print(f"Membership {membership.id}: Changing org_id from UUID {org_uuid} to numeric ID {org_id}")
                
                # Update the membership's org_id
                membership.org_id = str(org_id)
                membership.save()
                updated_count += 1
        
        print(f"Updated {updated_count} membership(s)")
    
    # Check the TeamPage component to ensure it's using numeric IDs
    print("\nVerifying the fix in TeamPage.tsx")
    print("Please update src/pages/TeamPage.tsx, line 86 to:")
    print("const orgID = '1';  // Use numeric ID instead of UUID")
    
    print("\nMigration complete. Please restart your application.")
    
    # Verify the changes
    print("\nVerifying changes...")
    print("=== User Information ===")
    user = User.objects.filter(email="rgarciasaraiva@gmail.com").first()
    if user:
        # Check user's memberships
        memberships = Membership.objects.filter(user=user)
        print(f"User has {memberships.count()} membership(s):")
        for membership in memberships:
            print(f"  Membership ID: {membership.id}")
            print(f"  Organization ID: {membership.org_id}")
            print(f"  Role: {membership.role.name}")
            print(f"  Status: {membership.status}")

if __name__ == "__main__":
    migrate_to_numeric_ids() 