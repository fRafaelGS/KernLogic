from accounts.models import User, Profile
from organizations.models import Organization

def create_profiles():
    default_org = Organization.objects.first()
    if not default_org:
        print("No organization found. Creating a Default organization...")
        default_org = Organization.objects.create(name="Default")
        print(f"Created organization: {default_org}")
    
    for user in User.objects.all():
        try:
            profile, created = Profile.objects.get_or_create(
                user=user,
                defaults={'organization': default_org}
            )
            if created:
                print(f"Created profile for {user.email}")
            else:
                # Update organization if profile exists but has no organization
                if not profile.organization:
                    profile.organization = default_org
                    profile.save()
                    print(f"Updated profile for {user.email} with organization")
                else:
                    print(f"Profile for {user.email} already exists with organization {profile.organization}")
        except Exception as e:
            print(f"Error creating profile for {user.email}: {e}")

if __name__ == "__main__":
    create_profiles() 