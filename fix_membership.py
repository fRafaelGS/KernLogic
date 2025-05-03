import os
import sys
import uuid
import django

# Setup Django environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.core.settings')
django.setup()

# Import Django models after setup
from django.contrib.auth import get_user_model
from accounts.models import Profile
from teams.models import Membership, Role

User = get_user_model()

def convert_to_uuid(simple_id):
    """Convert a simple ID (like '1') to a UUID format"""
    try:
        return uuid.UUID(simple_id)
    except ValueError:
        # Create a UUID by padding with zeros
        return uuid.UUID(f"00000000-0000-0000-0000-{int(simple_id):012d}")

def fix_membership():
    # Get the user
    user_email = "rgarciasaraiva@gmail.com"
    user = User.objects.filter(email=user_email).first()
    
    if not user:
        print(f"User with email {user_email} not found")
        return
    
    print(f"Found user: {user.email} (ID: {user.id})")
    
    # Get user's organization from profile
    profile = Profile.objects.filter(user=user).first()
    if profile and profile.organization:
        org_id = profile.organization.id
        print(f"User's organization ID: {org_id}")
    else:
        print("User doesn't have a profile or organization")
        return
    
    # Convert organization ID to UUID format
    org_id_str = str(org_id)
    org_uuid = convert_to_uuid(org_id_str)
    print(f"Organization ID {org_id_str} converted to UUID: {org_uuid}")
    
    # Check if membership exists for this organization UUID
    membership = Membership.objects.filter(user=user, org_id=org_uuid).first()
    
    if membership:
        print(f"Membership found: {membership.id} (Status: {membership.status}, Role: {membership.role.name})")
    else:
        print(f"No membership found for user in organization with UUID {org_uuid}")
        
        # Get default admin role
        admin_role = Role.objects.filter(name='Admin').first()
        if not admin_role:
            print("No Admin role found. Creating one...")
            admin_role = Role.objects.create(
                name='Admin',
                description='Administrator',
                permissions=['read', 'write', 'delete', 'admin']
            )
        
        # Create membership
        try:
            membership = Membership.objects.create(
                user=user,
                org_id=org_uuid,
                role=admin_role,
                status='active'
            )
            print(f"Created membership: {membership.id} (Status: {membership.status}, Role: {membership.role.name})")
        except Exception as e:
            print(f"Error creating membership: {str(e)}")
    
    # List all memberships for the user
    all_memberships = Membership.objects.filter(user=user)
    print("\nAll memberships for user:")
    for m in all_memberships:
        print(f"- Organization ID: {m.org_id}, Role: {m.role.name}, Status: {m.status}")

if __name__ == "__main__":
    fix_membership() 