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
    
    def __str__(self):
        return f"{self.user.email}'s profile"

# DEPRECATED: No longer needed since team-invite logic ensures every new user gets exactly one membership
# @receiver(post_save, sender=User)
# def create_user_profile(sender, instance, created, **kwargs):
#     """Create profile when user is created."""
#     if created:
#         try:
#             # Import here to avoid circular imports
#             from organizations.models import Organization
#             
#             # Find the default organization without using get_or_create
#             default_org = Organization.objects.filter(name="Default").first()
#             
#             # Create profile with or without organization
#             if default_org:
#                 Profile.objects.create(user=instance, organization=default_org)
#                 print(f"Created profile for {instance.email} with organization {default_org}")
#             else:
#                 Profile.objects.create(user=instance)
#                 print(f"Created profile for {instance.email} without organization")
#         except Exception as e:
#             print(f"Error creating profile for {instance.email}: {str(e)}")
#             try:
#                 # Create profile without organization as fallback
#                 Profile.objects.create(user=instance)
#                 print(f"Created profile for {instance.email} without organization")
#             except Exception as e:
#                 print(f"Critical error creating profile: {str(e)}")

# DEPRECATED: No longer needed since team-invite logic ensures every new user gets exactly one membership
# @receiver(post_save, sender=User)
# def save_user_profile(sender, instance, **kwargs):
#     """Save profile when user is saved."""
#     try:
#         # First try to access existing profile
#         profile = Profile.objects.filter(user=instance).first()
#         
#         # If profile doesn't exist, create one
#         if not profile:
#             # Import here to avoid circular imports
#             try:
#                 from organizations.models import Organization
#                 default_org = Organization.objects.filter(name="Default").first()
#                 if default_org:
#                     Profile.objects.create(user=instance, organization=default_org)
#                 else:
#                     Profile.objects.create(user=instance)
#                 print(f"Created missing profile for {instance.email}")
#             except Exception as e:
#                 print(f"Error creating profile: {str(e)}")
#                 # Create profile without organization as fallback
#                 Profile.objects.create(user=instance)
#                 print(f"Created profile for {instance.email} without organization")
#         else:
#             # Just save the existing profile
#             profile.save()
#             
#     except Exception as e:
#         print(f"Error in save_user_profile: {str(e)}")
