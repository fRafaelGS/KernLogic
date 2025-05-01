#!/usr/bin/env python
# Fix missing profiles script

import os
import django

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from accounts.models import User, Profile
from organizations.models import Organization

# Get or create default org
default_org, created = Organization.objects.get_or_create(name="Default")
if created:
    print(f"Created Default organization: {default_org}")
else:
    print(f"Using existing organization: {default_org}")

# Check and create profiles for all users
users = User.objects.all()
print(f"Found {users.count()} users")

for user in users:
    # Check if profile exists
    try:
        profile = Profile.objects.get(user=user)
        print(f"Profile for {user.email} already exists")
        
        # Update organization if missing
        if profile.organization is None:
            profile.organization = default_org
            profile.save()
            print(f"Updated profile for {user.email} with organization")
            
    except Profile.DoesNotExist:
        # Create new profile
        profile = Profile.objects.create(user=user, organization=default_org)
        print(f"Created new profile for {user.email}")

print("Profile fix completed!") 