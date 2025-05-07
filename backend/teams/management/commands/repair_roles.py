from django.core.management.base import BaseCommand
from teams.models import Role
from teams.constants import DEFAULT_ROLE_PERMISSIONS
from django.db import transaction
from organizations.models import Organization

class Command(BaseCommand):
    help = 'Repair team roles to ensure Admin, Editor, and Viewer roles exist with correct permissions'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force update of permissions even for existing roles',
        )

    def handle(self, *args, **options):
        force_update = options['force']
        self.stdout.write("Starting role repair process...")
        
        orgs = Organization.objects.all()
        self.stdout.write(f"Found {orgs.count()} organizations")
        
        for org in orgs:
            self.stdout.write(f"Processing organization: {org.name} (ID: {org.id})")
            
            with transaction.atomic():
                for role_name, permissions in DEFAULT_ROLE_PERMISSIONS.items():
                    role, created = Role.objects.get_or_create(
                        name=role_name,
                        organization=org,
                        defaults={
                            'description': f"Default {role_name} role",
                            'permissions': permissions
                        }
                    )
                    
                    if created:
                        self.stdout.write(self.style.SUCCESS(
                            f"Created {role_name} role for {org.name}"
                        ))
                    elif force_update:
                        # Update permissions if force flag is set
                        role.permissions = permissions
                        role.save(update_fields=['permissions'])
                        self.stdout.write(self.style.SUCCESS(
                            f"Updated permissions for {role_name} role in {org.name}"
                        ))
                    else:
                        self.stdout.write(
                            f"Role {role_name} already exists for {org.name} (ID: {role.id})"
                        )
        
        self.stdout.write(self.style.SUCCESS("Role repair completed successfully")) 