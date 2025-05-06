#!/usr/bin/env python
import os
import django
import sys

# Set up Django
sys.path.append('.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'kernlogic.settings')
django.setup()

from django.contrib.auth import get_user_model
from organizations.models import Organization
from teams.models import Role, Membership

User = get_user_model()

def create_memberships():
    """
    Create memberships for users who are missing them.
    """
    print("Starting membership creation...")
    
    # Get default organization (create if needed)
    default_org = None
    orgs = Organization.objects.all()
    
    if orgs.exists():
        default_org = orgs.first()
        print(f"Using existing organization: {default_org.name} (ID: {default_org.id})")
    else:
        default_org = Organization.objects.create(
            name="Default Organization",
            description="Default organization created during migration"
        )
        print(f"Created default organization: {default_org.name} (ID: {default_org.id})")
    
    # Get default admin role (create if needed)
    admin_role = Role.objects.filter(name="Admin").first()
    if not admin_role:
        admin_role = Role.objects.create(
            name="Admin",
            description="Administrator role with full permissions",
            permissions={"team.view": True, "team.invite": True, "team.change_role": True, "team.remove": True}
        )
        print(f"Created Admin role (ID: {admin_role.id})")
    else:
        print(f"Using existing Admin role (ID: {admin_role.id})")
    
    # Get all users
    users = User.objects.all()
    print(f"Found {users.count()} users")
    
    # For each user, check if they have a membership
    created_count = 0
    existing_count = 0
    
    for user in users:
        # Check for existing membership in default org
        existing_membership = Membership.objects.filter(
            user=user,
            organization=default_org
        ).first()
        
        if existing_membership:
            print(f"User {user.email} already has membership (Status: {existing_membership.status})")
            existing_count += 1
        else:
            # Create membership
            try:
                membership = Membership.objects.create(
                    user=user,
                    organization=default_org,
                    role=admin_role,
                    status="active"
                )
                print(f"Created membership for {user.email} (ID: {membership.id})")
                created_count += 1
            except Exception as e:
                print(f"Error creating membership for {user.email}: {str(e)}")
    
    print("\nSummary:")
    print(f"- {created_count} memberships created")
    print(f"- {existing_count} memberships already existed")
    print(f"- {users.count()} total users")

if __name__ == "__main__":
    create_memberships() 