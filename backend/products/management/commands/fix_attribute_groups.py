from django.core.management.base import BaseCommand
from products.models import AttributeGroup, AttributeGroupItem, Attribute
from django.db import transaction
from django.db.models import Count
from organizations.models import Organization

class Command(BaseCommand):
    help = 'Ensure all attribute groups have at least one attribute to make them visible in product UI'

    def handle(self, *args, **options):
        self.stdout.write("Starting attribute group repair...")
        
        # Get all groups with no items
        empty_groups = AttributeGroup.objects.annotate(
            item_count=Count('attributegroupitem')
        ).filter(item_count=0)
        
        self.stdout.write(f"Found {empty_groups.count()} empty attribute groups")
        
        # Process each organization separately
        orgs = Organization.objects.all()
        
        for org in orgs:
            self.stdout.write(f"Processing organization: {org.name} (ID: {org.id})")
            org_empty_groups = empty_groups.filter(organization=org)
            
            if not org_empty_groups.exists():
                self.stdout.write(f"No empty groups found for {org.name}")
                continue
                
            # Find available attributes for this organization
            attributes = Attribute.objects.filter(organization=org)
            
            if not attributes.exists():
                self.stdout.write(
                    self.style.WARNING(f"No attributes found for {org.name}, cannot fix empty groups")
                )
                continue
                
            # Add first attribute to each empty group
            with transaction.atomic():
                first_attribute = attributes.first()
                
                for group in org_empty_groups:
                    AttributeGroupItem.objects.create(
                        group=group,
                        attribute=first_attribute,
                        order=0
                    )
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"Added attribute {first_attribute.code} to group {group.name} (ID: {group.id})"
                        )
                    )
        
        self.stdout.write(self.style.SUCCESS("Attribute group repair completed")) 