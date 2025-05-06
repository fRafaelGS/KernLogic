from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from organizations.models import Organization
from teams.models import Role, Membership
from django.db import transaction
import traceback

User = get_user_model()

class Command(BaseCommand):
    help = 'Create memberships for users who don\'t have any'

    def handle(self, *args, **options):
        self.stdout.write("Starting membership creation...")
        
        try:
            # Try to get any existing organization
            org = Organization.objects.first()
            
            if not org:
                # Create a new organization if none exists
                org = Organization.objects.create(name="Default Organization")
                self.stdout.write(self.style.SUCCESS(f"Created organization: {org.name} (ID: {org.id})"))
            else:
                self.stdout.write(f"Using existing organization: {org.name} (ID: {org.id})")
            
            # Try to get admin role or create it
            admin_role = Role.objects.filter(name="Admin").first()
            
            if not admin_role:
                # Create Admin role
                admin_role = Role.objects.create(
                    name="Admin",
                    description="Administrator with full access",
                    permissions=["*"]  # Full permissions as a list
                )
                self.stdout.write(self.style.SUCCESS(f"Created Admin role (ID: {admin_role.id})"))
            else:
                self.stdout.write(f"Using existing Admin role (ID: {admin_role.id})")
            
            # Get all users
            users = User.objects.all()
            self.stdout.write(f"Found {users.count()} users")
            
            created_count = 0
            existing_count = 0
            error_count = 0
            
            for user in users:
                try:
                    with transaction.atomic():
                        # Check if user already has a membership in any organization
                        existing = Membership.objects.filter(
                            user=user,
                            organization=org
                        ).exists()
                        
                        if existing:
                            self.stdout.write(f"User {user.email} already has membership")
                            existing_count += 1
                        else:
                            # Create new membership
                            membership = Membership.objects.create(
                                user=user,
                                organization=org,
                                role=admin_role,
                                status="active"
                            )
                            self.stdout.write(self.style.SUCCESS(f"Created membership for user {user.email} (ID: {membership.id})"))
                            created_count += 1
                except Exception as e:
                    error_count += 1
                    self.stdout.write(self.style.ERROR(f"Error processing user {user.email}: {str(e)}"))
                    self.stdout.write(self.style.ERROR(traceback.format_exc()))
            
            self.stdout.write("\nSummary:")
            self.stdout.write(f"- {created_count} memberships created")
            self.stdout.write(f"- {existing_count} existing memberships")
            self.stdout.write(f"- {error_count} errors")
            self.stdout.write(f"- {users.count()} total users")
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error: {str(e)}"))
            self.stdout.write(self.style.ERROR(traceback.format_exc())) 