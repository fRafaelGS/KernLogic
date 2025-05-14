from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, extend_schema_view

from django.db import transaction
from django.db.models import Max

from kernlogic.org_queryset import OrganizationQuerySetMixin
from kernlogic.utils import get_user_organization
from products.permissions import (
    HasProductViewPermission,
    HasProductAddPermission,
    HasProductChangePermission,
    HasProductDeletePermission
)

from products.models import Family, FamilyAttributeGroup, AttributeGroup, Activity
from products.serializers import FamilySerializer, FamilyAttributeGroupSerializer


@extend_schema_view(
    list=extend_schema(summary="List product families", 
                      description="Returns product families for the current organization."),
    retrieve=extend_schema(summary="Get a specific product family", 
                         description="Returns details of a specific product family."),
    create=extend_schema(summary="Create a new product family", 
                       description="Create a new product family for the current organization."),
    update=extend_schema(summary="Update a product family", 
                       description="Update an existing product family."),
    partial_update=extend_schema(summary="Partially update a product family", 
                               description="Partially update an existing product family."),
    destroy=extend_schema(summary="Delete a product family", 
                        description="Delete a product family."),
)
class FamilyViewSet(OrganizationQuerySetMixin, viewsets.ModelViewSet):
    """
    API endpoint for managing product families.
    """
    queryset = Family.objects.all()
    serializer_class = FamilySerializer

    def get_permissions(self):
        if self.action == 'create':
            return [IsAuthenticated(), HasProductAddPermission()]
        elif self.action in ['update', 'partial_update']:
            return [IsAuthenticated(), HasProductChangePermission()]
        elif self.action == 'destroy':
            return [IsAuthenticated(), HasProductDeletePermission()]
        return [IsAuthenticated(), HasProductViewPermission()]

    def get_queryset(self):
        org = get_user_organization(self.request.user)
        return super().get_queryset().filter(organization=org).prefetch_related('attribute_groups', 'attribute_groups__attribute_group')

    def perform_create(self, serializer):
        org = get_user_organization(self.request.user)
        instance = serializer.save(organization=org, created_by=self.request.user)
        Activity.objects.create(
            user=self.request.user,
            organization=org,
            action='create',
            entity='family',
            entity_id=str(instance.id),
            message=f"Created family: {instance.label}"
        )

    def perform_update(self, serializer):
        instance = serializer.save()
        Activity.objects.create(
            user=self.request.user,
            organization=instance.organization,
            action='update',
            entity='family',
            entity_id=str(instance.id),
            message=f"Updated family: {instance.label}"
        )

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save()
        Activity.objects.create(
            user=self.request.user,
            organization=instance.organization,
            action='delete',
            entity='family',
            entity_id=str(instance.id),
            message=f"Deleted family: {instance.label}"
        )

    @action(detail=True, methods=['post'], url_path='attribute-groups')
    def manage_attribute_groups(self, request, pk=None):
        family = self.get_object()
        org = get_user_organization(request.user)
        serializer = FamilyAttributeGroupSerializer(data=request.data, context={'request': request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        data = serializer.validated_data
        attribute_group = data['attribute_group']
        family_group, created = FamilyAttributeGroup.objects.get_or_create(
            family=family,
            attribute_group=attribute_group,
            organization=org,
            defaults={
                'required': data.get('required', False),
                'order': data.get('order', 0)
            }
        )
        if not created:
            if 'required' in data:
                family_group.required = data['required']
            if 'order' in data:
                family_group.order = data['order']
            family_group.save()
        Activity.objects.create(
            user=request.user,
            organization=org,
            action='attribute_group',
            entity='family',
            entity_id=str(family.id),
            message=f"{'Added' if created else 'Updated'} attribute group {attribute_group.name} to family {family.label}"
        )
        return Response(FamilyAttributeGroupSerializer(family_group).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    @action(detail=True, methods=['delete'], url_path='attribute-groups/(?P<group_id>\\d+)')
    def remove_attribute_group(self, request, pk=None, group_id=None):
        family = self.get_object()
        org = get_user_organization(request.user)
        try:
            family_group = FamilyAttributeGroup.objects.get(
                family=family,
                attribute_group_id=group_id,
                organization=org
            )
            group_name = family_group.attribute_group.name
            family_group.delete()
            Activity.objects.create(
                user=request.user,
                organization=org,
                action='attribute_group',
                entity='family',
                entity_id=str(family.id),
                message=f"Removed attribute group {group_name} from family {family.label}"
            )
            return Response(status=status.HTTP_204_NO_CONTENT)
        except FamilyAttributeGroup.DoesNotExist:
            return Response(
                {"error": "Attribute group not associated with this family"},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['post'], url_path='bulk-attribute-groups')
    def bulk_add_attribute_groups(self, request, pk=None):
        family = self.get_object()
        org = get_user_organization(request.user)
        group_ids = request.data.get('attribute_group_ids', [])
        created_groups = []
        group_names = []
        for group_id in group_ids:
            try:
                attribute_group = AttributeGroup.objects.get(id=group_id, organization=org)
                family_group, created = FamilyAttributeGroup.objects.get_or_create(
                    family=family,
                    attribute_group=attribute_group,
                    organization=org
                )
                if created:
                    created_groups.append(family_group)
                    group_names.append(attribute_group.name)
            except AttributeGroup.DoesNotExist:
                continue
        if created_groups and group_names:
            Activity.objects.create(
                user=request.user,
                organization=org,
                action='attribute_group',
                entity='family',
                entity_id=str(family.id),
                message=f"Bulk added attribute groups to family {family.label}: {', '.join(group_names)}"
            )
        return Response(FamilyAttributeGroupSerializer(created_groups, many=True).data, status=status.HTTP_201_CREATED) 