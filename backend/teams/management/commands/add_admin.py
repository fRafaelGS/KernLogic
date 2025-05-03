import uuid
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from teams.models import Role, Membership

User = get_user_model()

class Command(BaseCommand):
    help = 'Add a user as an admin to an organization'

    def add_arguments(self, parser):
        parser.add_argument('email', type=str, help='Email of the user to add as admin')
        parser.add_argument('--org-id', type=str, help='Organization ID (defaults to a new UUID if not provided)')

    def handle(self, *args, **options):
        email = options['email']
        org_id = options.get('org_id')
        
        # If no org_id is provided, generate a new one
        if not org_id:
            org_id = str(uuid.uuid4())
            self.stdout.write(self.style.WARNING(f"No org ID provided. Using newly generated UUID: {org_id}"))
        
        # Get or create the user
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'username': email,
                'is_staff': True,
                'is_active': True,
            }
        )
        
        if created:
            # Set a temporary password for new users - should be changed immediately
            user.set_password('changeme')
            user.save()
            self.stdout.write(self.style.SUCCESS(f"Created new user: {email} with password 'changeme'"))
        else:
            self.stdout.write(self.style.SUCCESS(f"Found existing user: {email}"))
        
        # Get or create the Admin role
        admin_role, role_created = Role.objects.get_or_create(
            name='Admin',
            defaults={
                'description': 'Full administrative access',
                'permissions': ['team.manage', 'team.view']  # Example permissions
            }
        )
        
        if role_created:
            self.stdout.write(self.style.SUCCESS("Created new Admin role"))
        else:
            self.stdout.write(self.style.SUCCESS("Found existing Admin role"))
        
        # Check if the membership already exists
        existing_membership = Membership.objects.filter(
            user=user,
            org_id=org_id
        ).first()
        
        if existing_membership:
            # If exists but not admin, update the role
            if existing_membership.role != admin_role:
                old_role = existing_membership.role.name
                existing_membership.role = admin_role
                existing_membership.status = 'active'  # Ensure active status
                existing_membership.save()
                self.stdout.write(
                    self.style.SUCCESS(f"Updated existing membership from {old_role} to Admin")
                )
            else:
                self.stdout.write(
                    self.style.SUCCESS(f"User already has Admin membership in this org")
                )
        else:
            # Create the membership
            Membership.objects.create(
                user=user,
                org_id=org_id,
                role=admin_role,
                status='active'
            )
            self.stdout.write(
                self.style.SUCCESS(f"Added user as Admin to organization {org_id}")
            ) 