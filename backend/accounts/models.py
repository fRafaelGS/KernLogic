from django.contrib.auth.models import AbstractUser
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver

class User(AbstractUser):
    email = models.EmailField(unique=True)
    name = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'name']

    def __str__(self):
        return self.email

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    organization = models.ForeignKey("organizations.Organization", on_delete=models.PROTECT, null=True)
    
    def __str__(self):
        return f"{self.user.email}'s profile"

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """Create a profile for a newly created user and associate with default organization."""
    if created:
        # Import here to avoid circular imports
        from organizations.models import Organization
        
        # Get or create default organization
        default_org, _ = Organization.objects.get_or_create(name="Default")
        
        # Create profile with organization
        Profile.objects.create(user=instance, organization=default_org)
        print(f"Created profile for {instance.email} with organization {default_org}")

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    """Save profile when user is saved."""
    # Make sure profile exists
    if not hasattr(instance, 'profile'):
        # Import here to avoid circular imports
        from organizations.models import Organization
        default_org, _ = Organization.objects.get_or_create(name="Default")
        Profile.objects.create(user=instance, organization=default_org)
        print(f"Created missing profile for {instance.email} with organization {default_org}")
    
    instance.profile.save()
