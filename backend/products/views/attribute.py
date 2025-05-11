from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, extend_schema_view
from django.db import transaction

from products.models import Attribute, AttributeOption
from products.serializers import AttributeSerializer
from products.permissions import IsStaffOrReadOnly
from kernlogic.org_queryset import OrganizationQuerySetMixin
from kernlogic.utils import get_user_organization

@extend_schema_view(
    list=extend_schema(summary="List all attributes", 
                      description="Returns attributes for the current organization."),
    retrieve=extend_schema(summary="Get a specific attribute", 
                         description="Returns details of a specific attribute."),
    create=extend_schema(summary="Create a new attribute", 
                       description="Create a new attribute for the current organization. Staff only."),
    update=extend_schema(summary="Update an attribute", 
                       description="Update an existing attribute. Staff only."),
    partial_update=extend_schema(summary="Partially update an attribute", 
                              description="Partially update an existing attribute. Staff only."),
    destroy=extend_schema(summary="Delete an attribute", 
                        description="Delete an attribute. Staff only."),
)
class AttributeViewSet(OrganizationQuerySetMixin, viewsets.ModelViewSet):
    """
    API endpoint for managing product attributes.
    """
    queryset = Attribute.objects.all()
    serializer_class = AttributeSerializer
    permission_classes = [IsAuthenticated, IsStaffOrReadOnly]
    
    def perform_create(self, serializer):
        """Set organization and created_by from request user, and handle options for select attributes."""
        with transaction.atomic():
            attribute = serializer.save(
                organization=get_user_organization(self.request.user),
                created_by=self.request.user
            )
            # Handle options for select attributes
            request = self.request
            options = request.data.get('options', [])
            if attribute.data_type == 'select' and options:
                for idx, opt in enumerate(options):
                    if isinstance(opt, dict):
                        value = opt.get('value') or opt.get('label')
                        label = opt.get('label') or opt.get('value')
                    else:
                        value = label = str(opt)
                    AttributeOption.objects.create(
                        attribute=attribute,
                        value=value,
                        label=label,
                        order=idx
                    )

    def perform_update(self, serializer):
        """Update attribute and sync options for select attributes."""
        with transaction.atomic():
            attribute = serializer.save()
            request = self.request
            options = request.data.get('options', None)
            if attribute.data_type == 'select' and options is not None:
                # Remove options not in the new list
                keep_values = set(
                    (opt.get('value') if isinstance(opt, dict) else str(opt))
                    or (opt.get('label') if isinstance(opt, dict) else str(opt))
                    for opt in options
                )
                AttributeOption.objects.filter(attribute=attribute).exclude(value__in=keep_values).delete()
                # Add or update options
                for idx, opt in enumerate(options):
                    if isinstance(opt, dict):
                        value = opt.get('value') or opt.get('label')
                        label = opt.get('label') or opt.get('value')
                    else:
                        value = label = str(opt)
                    obj, created = AttributeOption.objects.update_or_create(
                        attribute=attribute,
                        value=value,
                        defaults={
                            'label': label,
                            'order': idx
                        }
                    )

    def perform_destroy(self, instance):
        """Delete an attribute. Staff only."""
        instance.delete() 