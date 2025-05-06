import os
import sys
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

# Now import Django models
from django.contrib.auth import get_user_model
from organizations.models import Organization
from teams.models import Role, Membership
from django.db import transaction

User = get_user_model()

def create_org_and_roles():
    """Create organization and required roles if they don't exist"""
    print("Checking organization...")
    try:
        # Create organization if it doesn't exist
        org, created = Organization.objects.get_or_create(
            name="Default Organization",
            defaults={
                "description": "Default organization created during migration"
            }
        )
        if created:
            print(f"Created organization: {org.name} (ID: {org.id})")
        else:
            print(f"Using existing organization: {org.name} (ID: {org.id})")
            
        # Create Admin role if it doesn't exist
        admin_role, created = Role.objects.get_or_create(
            name="Admin",
            defaults={
                "description": "Administrator with full access",
                "permissions": {"*": True}  # Full permissions
            }
        )
        if created:
            print(f"Created Admin role (ID: {admin_role.id})")
        else:
            print(f"Using existing Admin role (ID: {admin_role.id})")
            
        # Create Editor role if it doesn't exist
        editor_role, created = Role.objects.get_or_create(
            name="Editor",
            defaults={
                "description": "Editor with content management access",
                "permissions": {
                    "products.view": True,
                    "products.create": True,
                    "products.edit": True,
                    "team.view": True
                }
            }
        )
        if created:
            print(f"Created Editor role (ID: {editor_role.id})")
        else:
            print(f"Using existing Editor role (ID: {editor_role.id})")
            
        # Create Viewer role if it doesn't exist
        viewer_role, created = Role.objects.get_or_create(
            name="Viewer",
            defaults={
                "description": "Viewer with read-only access",
                "permissions": {
                    "products.view": True,
                    "team.view": True
                }
            }
        )
        if created:
            print(f"Created Viewer role (ID: {viewer_role.id})")
        else:
            print(f"Using existing Viewer role (ID: {viewer_role.id})")
            
        return org, admin_role
    except Exception as e:
        print(f"Error creating organization and roles: {str(e)}")
        return None, None

def create_memberships():
    """Create memberships for users who don't have one"""
    org, admin_role = create_org_and_roles()
    if not org or not admin_role:
        print("Failed to get organization or admin role. Cannot continue.")
        return
    
    users = User.objects.all()
    print(f"Found {users.count()} users")
    
    created_count = 0
    existing_count = 0
    error_count = 0
    
    for user in users:
        try:
            with transaction.atomic():
                # Check if user already has a membership
                existing = Membership.objects.filter(
                    user=user,
                    organization=org
                ).exists()
                
                if existing:
                    print(f"User {user.email} already has membership")
                    existing_count += 1
                else:
                    # Create new membership
                    membership = Membership.objects.create(
                        user=user,
                        organization=org,
                        role=admin_role,
                        status="active"
                    )
                    print(f"Created membership for user {user.email} (ID: {membership.id})")
                    created_count += 1
        except Exception as e:
            print(f"Error processing user {user.email}: {str(e)}")
            error_count += 1
    
    print("\nSummary:")
    print(f"- {created_count} memberships created")
    print(f"- {existing_count} existing memberships")
    print(f"- {error_count} errors")
    print(f"- {users.count()} total users")

if __name__ == "__main__":
    print("Starting membership fix script...")
    create_memberships()
    print("Done!") 