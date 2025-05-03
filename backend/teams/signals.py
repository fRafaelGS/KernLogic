# teams/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from organizations.models import Organization
from .models import Role
from .constants import DEFAULT_ROLE_PERMISSIONS

@receiver(post_save, sender=Organization)
def seed_org_roles(sender, instance, created, **kwargs):
    """
    When a new organization is created, automatically create default roles with permissions.
    """
    if not created:
        return
        
    # Create the standard roles for this organization
    for role_name, perms in DEFAULT_ROLE_PERMISSIONS.items():
        # Create role with this organization
        Role.objects.create(
            name=role_name,
            organization=instance,
            permissions=perms,
            description=f"Default {role_name} role"
        ) 