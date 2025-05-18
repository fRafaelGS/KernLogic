import os
import sys
import django

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
os.environ['SKIP_ENV_VALIDATION'] = 'true'
django.setup()

# Import necessary models
from organizations.models import Organization, LOCALES
from products.models import Locale

def main():
    # Check configured locales in LOCALES constant
    print("=== Configured Locales in Organization model ===")
    for code, label in LOCALES:
        print(f"- {code}: {label}")
    print()
    
    # Check available organizations
    print("=== Organizations ===")
    for org in Organization.objects.all():
        print(f"ID: {org.id}, Name: {org.name}")
        print(f"  default_locale (CharField): {org.default_locale}")
        print(f"  default_locale_ref (FK): {org.default_locale_ref}")
        if org.default_channel:
            print(f"  default_channel: {org.default_channel.code} ({org.default_channel.name})")
        else:
            print("  default_channel: None")
    print()
    
    # Check available locales
    print("=== Available Locales ===")
    for locale in Locale.objects.all():
        print(f"ID: {locale.id}, Code: {locale.code}, Label: {locale.label}, Org: {locale.organization_id}")
    print()
    
    # List locales for each organization
    print("=== Locales by Organization ===")
    for org in Organization.objects.all():
        print(f"Organization: {org.name} (ID: {org.id})")
        org_locales = Locale.objects.filter(organization=org)
        if org_locales.exists():
            for locale in org_locales:
                print(f"  - {locale.code}: {locale.label}")
        else:
            print("  No locales defined for this organization")
    print()
    
    # Test what happens if we try to set a locale that's not in the choices
    org_id = 1  # Change this if needed
    try:
        org = Organization.objects.get(id=org_id)
        print(f"Testing update for organization: {org.name} (ID: {org.id})")
        
        # Try setting a valid locale from the LOCALES choices
        test_locale = "de_AT"  # Not in LOCALES list
        print(f"Trying to set default_locale to '{test_locale}'")
        
        org.default_locale = test_locale
        
        # This would raise a validation error during full_clean()
        try:
            org.full_clean()
            print("✓ Validation passed")
            # Save would work here
            print("Would save successfully")
        except django.core.exceptions.ValidationError as e:
            print("✗ Validation error:")
            for field, errors in e.message_dict.items():
                print(f"  {field}: {', '.join(errors)}")
    except Organization.DoesNotExist:
        print(f"Organization with ID {org_id} does not exist")

if __name__ == "__main__":
    main() 