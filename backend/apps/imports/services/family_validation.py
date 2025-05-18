import logging
from django.db import transaction
from django.conf import settings
from typing import Dict, List, Set, Tuple, Optional, Any

from products.models import Family, Attribute, AttributeGroupItem, FamilyAttributeGroup

logger = logging.getLogger(__name__)

# Error codes
ERROR_FAMILY_UNKNOWN = "FAMILY_UNKNOWN"
ERROR_NOT_IN_FAMILY = "ATTRIBUTE_NOT_IN_FAMILY"


def build_family_attribute_map(organization_id) -> Dict[str, Set[str]]:
    """
    Build a mapping of family codes to sets of attribute codes from the database.
    This ensures we're always using the latest data, not relying on in-memory state.
    
    Args:
        organization_id: The organization ID to filter by
        
    Returns:
        Dict mapping family codes to sets of attribute codes
    """
    family_attr_map = {}
    
    # Get all families for this organization
    families = Family.objects.filter(organization_id=organization_id)
    
    for family in families:
        # Get all attribute groups associated with this family
        family_groups = FamilyAttributeGroup.objects.filter(
            family=family,
            organization_id=organization_id
        ).values_list('attribute_group_id', flat=True)
        
        # Get all attributes in these groups
        attributes = Attribute.objects.filter(
            organization_id=organization_id,
            attributegroupitem__group_id__in=family_groups
        ).values_list('code', flat=True)
        
        # Store the set of attribute codes for this family
        family_attr_map[family.code] = set(attributes)
    
    return family_attr_map


def validate_family(family_code: str, family_attr_map: Dict[str, Set[str]]) -> Tuple[bool, Optional[str]]:
    """
    Validate that a family exists in the mapping.
    
    Args:
        family_code: The family code to check
        family_attr_map: Mapping of family codes to attribute codes
        
    Returns:
        Tuple of (is_valid, error_code)
    """
    if not family_code:
        return True, None  # No family code provided, so no validation needed
    
    if family_code not in family_attr_map:
        return False, ERROR_FAMILY_UNKNOWN
    
    return True, None


def validate_attribute_in_family(
    attribute_code: str, 
    family_code: str, 
    family_attr_map: Dict[str, Set[str]],
    relax_template: bool = False
) -> Tuple[bool, Optional[str]]:
    """
    Validate that an attribute is associated with a family.
    
    Args:
        attribute_code: The attribute code to check
        family_code: The family code to check against
        family_attr_map: Mapping of family codes to attribute codes
        relax_template: If True, skips validation and always returns valid
        
    Returns:
        Tuple of (is_valid, error_code)
    """
    if not attribute_code or not family_code:
        return True, None  # Not enough info to validate
    
    # First validate the family exists
    family_valid, error = validate_family(family_code, family_attr_map)
    if not family_valid:
        return family_valid, error
    
    # If we're relaxing the template requirements, skip further validation
    if relax_template:
        return True, None
    
    # Check if the attribute is in the family
    family_attributes = family_attr_map.get(family_code, set())
    if attribute_code not in family_attributes:
        return False, ERROR_NOT_IN_FAMILY
    
    return True, None


@transaction.atomic
def auto_attach_attribute_to_family(
    attribute_code: str,
    family_code: str,
    organization_id: int,
    user_id: Optional[int] = None
) -> bool:
    """
    Automatically attach an attribute to a family when IMPORT_RELAX_TEMPLATE is True.
    
    Args:
        attribute_code: The attribute code to attach
        family_code: The family code to attach to
        organization_id: The organization ID
        user_id: The user ID performing the operation (for audit)
        
    Returns:
        True if successful, False if failed
    """
    try:
        # Get the family
        family = Family.objects.get(code=family_code, organization_id=organization_id)
        
        # Get the attribute
        attribute = Attribute.objects.get(code=attribute_code, organization_id=organization_id)
        
        # Get the family's attribute groups
        family_groups = FamilyAttributeGroup.objects.filter(
            family=family,
            organization_id=organization_id
        )
        
        # If the family has no attribute groups, we can't attach the attribute
        if not family_groups.exists():
            logger.warning(
                f"Cannot auto-attach attribute {attribute_code} to family {family_code}: "
                f"family has no attribute groups"
            )
            return False
        
        # Try to find an existing group-attribute relationship
        group_items = AttributeGroupItem.objects.filter(
            attribute=attribute,
            group__in=family_groups.values_list('attribute_group_id', flat=True)
        )
        
        # If we already have this attribute in one of the family's groups, we're done
        if group_items.exists():
            return True
        
        # Otherwise, attach it to the first group
        first_group = family_groups.first().attribute_group
        AttributeGroupItem.objects.create(
            group=first_group,
            attribute=attribute,
            order=0  # Default order at the end
        )
        
        # Increment the family version
        family.version = (family.version or 0) + 1
        family.save(update_fields=['version'])
        
        logger.info(
            f"Auto-attached attribute {attribute_code} to family {family_code} "
            f"in group {first_group.name}"
        )
        
        return True
        
    except (Family.DoesNotExist, Attribute.DoesNotExist) as e:
        logger.error(f"Error auto-attaching attribute to family: {str(e)}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error auto-attaching attribute to family: {str(e)}")
        return False 