import uuid
from django.core.management.base import BaseCommand
from django.db import transaction, connection
from django.db.models import Q
from organizations.models import Organization
from accounts.models import Profile
from products.models import (
    Product, ProductImage, ProductRelation, 
    Activity, ProductAsset, ProductEvent,
    Attribute, AttributeValue, AttributeGroup
)

class Command(BaseCommand):
    help = 'Converts Organization UUIDs to integers and updates all related models'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.SUCCESS('Starting UUID to integer conversion...'))
        
        # First check the state of the database
        self.check_database_state()
        
        # We'll do this in a transaction to ensure everything succeeds or fails together
        with transaction.atomic():
            # First, let's rename existing organizations to avoid unique name conflicts
            for org in Organization.objects.all():
                org.name = f"{org.name}_old_uuid"
                org.save(update_fields=['name'])
                
            # Create a mapping of old UUID to new integer ID
            uuid_to_int = {}
            
            # Create new integer-based organizations 
            for old_org in Organization.objects.all():
                # Create a new org with the original name
                original_name = old_org.name[:-9]  # Remove "_old_uuid" suffix
                
                # We need to get UUID as string for comparison with FKs stored as strings
                old_uuid = str(old_org.uuid) if old_org.uuid else str(old_org.id)
                
                new_org = Organization(
                    name=original_name,
                    created_at=old_org.created_at,
                    uuid=uuid.uuid4()  # Generate a new UUID to satisfy the NOT NULL constraint
                )
                new_org.save()
                
                # Record the mapping from UUID to integer ID
                uuid_to_int[old_uuid] = new_org.id
                
                self.stdout.write(self.style.SUCCESS(f'Created new org: {new_org.id} from UUID {old_uuid}'))
            
            # Update all foreign keys in related models
            # 1. Profiles
            self.stdout.write(self.style.SUCCESS('Updating Profiles...'))
            profile_count = 0
            for profile in Profile.objects.filter(organization__isnull=False):
                old_org_id = str(profile.organization_id)
                if old_org_id in uuid_to_int:
                    profile.organization_id = uuid_to_int[old_org_id]
                    profile.save(update_fields=['organization'])
                    profile_count += 1
            self.stdout.write(self.style.SUCCESS(f'Updated {profile_count} profiles'))
            
            # 2. Products
            self.stdout.write(self.style.SUCCESS('Updating Products...'))
            product_count = 0
            for product in Product.objects.filter(organization__isnull=False):
                old_org_id = str(product.organization_id)
                if old_org_id in uuid_to_int:
                    product.organization_id = uuid_to_int[old_org_id]
                    product.save(update_fields=['organization'])
                    product_count += 1
            self.stdout.write(self.style.SUCCESS(f'Updated {product_count} products'))
            
            # 3. Product Images
            self.stdout.write(self.style.SUCCESS('Updating Product Images...'))
            image_count = 0
            for img in ProductImage.objects.filter(organization__isnull=False):
                old_org_id = str(img.organization_id)
                if old_org_id in uuid_to_int:
                    img.organization_id = uuid_to_int[old_org_id]
                    img.save(update_fields=['organization'])
                    image_count += 1
            self.stdout.write(self.style.SUCCESS(f'Updated {image_count} product images'))
            
            # 4. Product Relations
            self.stdout.write(self.style.SUCCESS('Updating Product Relations...'))
            relation_count = 0
            for rel in ProductRelation.objects.filter(organization__isnull=False):
                old_org_id = str(rel.organization_id)
                if old_org_id in uuid_to_int:
                    rel.organization_id = uuid_to_int[old_org_id]
                    rel.save(update_fields=['organization'])
                    relation_count += 1
            self.stdout.write(self.style.SUCCESS(f'Updated {relation_count} product relations'))
            
            # 5. Activities
            self.stdout.write(self.style.SUCCESS('Updating Activities...'))
            activity_count = 0
            for activity in Activity.objects.filter(organization__isnull=False):
                old_org_id = str(activity.organization_id)
                if old_org_id in uuid_to_int:
                    activity.organization_id = uuid_to_int[old_org_id]
                    activity.save(update_fields=['organization'])
                    activity_count += 1
            self.stdout.write(self.style.SUCCESS(f'Updated {activity_count} activities'))
            
            # 6. Product Assets
            self.stdout.write(self.style.SUCCESS('Updating Product Assets...'))
            asset_count = 0
            for asset in ProductAsset.objects.filter(organization__isnull=False):
                old_org_id = str(asset.organization_id)
                if old_org_id in uuid_to_int:
                    asset.organization_id = uuid_to_int[old_org_id]
                    asset.save(update_fields=['organization'])
                    asset_count += 1
            self.stdout.write(self.style.SUCCESS(f'Updated {asset_count} product assets'))
            
            # 7. Product Events
            self.stdout.write(self.style.SUCCESS('Updating Product Events...'))
            event_count = 0
            for event in ProductEvent.objects.filter(organization__isnull=False):
                old_org_id = str(event.organization_id)
                if old_org_id in uuid_to_int:
                    event.organization_id = uuid_to_int[old_org_id]
                    event.save(update_fields=['organization'])
                    event_count += 1
            self.stdout.write(self.style.SUCCESS(f'Updated {event_count} product events'))
            
            # 8. Attributes
            self.stdout.write(self.style.SUCCESS('Updating Attributes...'))
            attribute_count = 0
            for attr in Attribute.objects.filter(organization__isnull=False):
                old_org_id = str(attr.organization_id)
                if old_org_id in uuid_to_int:
                    attr.organization_id = uuid_to_int[old_org_id]
                    attr.save(update_fields=['organization'])
                    attribute_count += 1
            self.stdout.write(self.style.SUCCESS(f'Updated {attribute_count} attributes'))
            
            # 9. Attribute Values
            self.stdout.write(self.style.SUCCESS('Updating Attribute Values...'))
            value_count = 0
            for val in AttributeValue.objects.filter(organization__isnull=False):
                old_org_id = str(val.organization_id)
                if old_org_id in uuid_to_int:
                    val.organization_id = uuid_to_int[old_org_id]
                    val.save(update_fields=['organization'])
                    value_count += 1
            self.stdout.write(self.style.SUCCESS(f'Updated {value_count} attribute values'))
            
            # 10. Attribute Groups
            self.stdout.write(self.style.SUCCESS('Updating Attribute Groups...'))
            group_count = 0
            for group in AttributeGroup.objects.filter(organization__isnull=False):
                old_org_id = str(group.organization_id)
                if old_org_id in uuid_to_int:
                    group.organization_id = uuid_to_int[old_org_id]
                    group.save(update_fields=['organization'])
                    group_count += 1
            self.stdout.write(self.style.SUCCESS(f'Updated {group_count} attribute groups'))
            
            # Delete the old UUID organizations
            old_org_count = Organization.objects.filter(name__endswith='_old_uuid').count()
            Organization.objects.filter(name__endswith='_old_uuid').delete()
            self.stdout.write(self.style.SUCCESS(f'Removed {old_org_count} old UUID organizations'))
        
        self.stdout.write(self.style.SUCCESS('Conversion complete!'))
    
    def check_database_state(self):
        """
        Check the current state of the database to understand what fields are available
        """
        with connection.cursor() as cursor:
            cursor.execute("PRAGMA table_info(organizations_organization)")
            table_info = cursor.fetchall()
            
            columns = {col[1]: col for col in table_info}
            
            self.stdout.write(self.style.SUCCESS('Current organization table structure:'))
            for col_name, col_info in columns.items():
                self.stdout.write(f'  {col_name}: {col_info}')
                
            # UUID information
            cursor.execute("SELECT id, name, uuid FROM organizations_organization LIMIT 5")
            samples = cursor.fetchall()
            
            self.stdout.write(self.style.SUCCESS('Sample organization records:'))
            for sample in samples:
                self.stdout.write(f'  ID: {sample[0]}, Name: {sample[1]}, UUID: {sample[2]}') 