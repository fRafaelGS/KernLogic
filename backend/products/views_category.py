from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.db.models import Q
from rest_framework import viewsets, status, filters
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError, PermissionDenied
from rest_framework.renderers import JSONRenderer
from kernlogic.org_queryset import OrganizationQuerySetMixin
from kernlogic.utils import get_user_organization
from .pagination import StandardResultsSetPagination
from .models import Category, Product
from .serializers import CategorySerializer
from .permissions import HasProductViewPermission, HasProductAddPermission, HasProductChangePermission, HasProductDeletePermission
from drf_spectacular.utils import extend_schema, extend_schema_view


@method_decorator(csrf_exempt, name='dispatch')
@extend_schema_view(
    list=extend_schema(summary="List all categories", 
                      description="Returns a hierarchical tree of categories for the current organization."),
    retrieve=extend_schema(summary="Get a specific category", 
                         description="Returns details of a specific category including its children."),
    create=extend_schema(summary="Create a new category", 
                       description="Create a new category with optional parent."),
    update=extend_schema(summary="Update a category", 
                       description="Update an existing category."),
    partial_update=extend_schema(summary="Partially update a category", 
                               description="Partially update an existing category."),
    destroy=extend_schema(summary="Delete a category", 
                        description="Delete a category. This will fail if products are still assigned to it."),
)
class CategoryViewSet(OrganizationQuerySetMixin, viewsets.ModelViewSet):
    """
    API endpoint for managing product categories.
    Supports hierarchical category management with parent-child relationships.
    """
    serializer_class = CategorySerializer
    pagination_class = None  # No pagination for categories as we return the full tree
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name']
    ordering_fields = ['name', 'tree_id', 'lft']
    ordering = ['tree_id', 'lft']
    renderer_classes = [JSONRenderer]
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']
    permission_classes = [HasProductViewPermission]

    def get_permissions(self):
        """
        Override to set custom permissions per action
        """
        if self.action in ['create', 'update', 'partial_update']:
            self.permission_classes = [HasProductAddPermission]
        elif self.action == 'destroy':
            self.permission_classes = [HasProductDeletePermission]
        return super().get_permissions()

    def get_queryset(self):
        """
        Return categories for the current user's organization.
        With proper MPTT ordering to maintain tree structure.
        """
        queryset = Category.objects.filter(
            organization=get_user_organization(self.request.user)
        ).order_by('tree_id', 'lft')
        
        # Handle filtering by parent_id
        parent_id = self.request.query_params.get('parent_id')
        if parent_id:
            if parent_id.lower() == 'null':
                # Filter root categories (no parent)
                queryset = queryset.filter(parent__isnull=True)
            else:
                try:
                    # Get the parent category
                    parent = Category.objects.get(
                        id=parent_id, 
                        organization=get_user_organization(self.request.user)
                    )
                    # Get the parent and all its descendants
                    queryset = parent.get_descendants(include_self=True)
                except (Category.DoesNotExist, ValueError):
                    # If parent doesn't exist, return empty queryset
                    queryset = Category.objects.none()
        
        # Full-text search if provided
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(name__icontains=search)
            
        return queryset

    def list(self, request, *args, **kwargs):
        """
        Override list to return a tree structure if requested
        """
        as_tree = request.query_params.get('as_tree', 'true').lower() == 'true'
        
        if as_tree:
            # Get root nodes only and let serializer handle the children
            queryset = self.get_queryset().filter(parent__isnull=True)
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
        else:
            # Regular flat list
            return super().list(request, *args, **kwargs)

    def perform_create(self, serializer):
        """
        Assign the organization when creating a new category
        """
        serializer.save(organization=get_user_organization(self.request.user))

    @action(detail=True, methods=['get'])
    def products(self, request, pk=None):
        """
        Return products assigned to this category or any of its subcategories
        """
        category = self.get_object()
        
        # Get all descendant categories
        category_ids = [category.id] + list(
            category.get_descendants().values_list('id', flat=True)
        )
        
        # Filter products by these categories
        products = Product.objects.filter(
            category_id__in=category_ids,
            organization=get_user_organization(request.user),
            is_active=True,
            is_archived=False
        )
        
        # Paginate the results using the product pagination
        from .views_main import ProductViewSet
        paginator = ProductViewSet.pagination_class()
        page = paginator.paginate_queryset(products, request)
        
        from .serializers import ProductSerializer
        serializer = ProductSerializer(page, many=True, context={'request': request})
        
        return paginator.get_paginated_response(serializer.data)
        
    @action(detail=False, methods=['post'])
    def move(self, request):
        """
        Move a category to a new parent
        """
        category_id = request.data.get('category_id')
        new_parent_id = request.data.get('parent_id')
        
        if not category_id:
            return Response(
                {"error": "category_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            category = Category.objects.get(
                id=category_id,
                organization=get_user_organization(request.user)
            )
        except Category.DoesNotExist:
            return Response(
                {"error": "Category not found"},
                status=status.HTTP_404_NOT_FOUND
            )
            
        # If new_parent_id is None, move to root
        if not new_parent_id or new_parent_id.lower() == 'null':
            category.parent = None
            category.save()
            return Response({"status": "Category moved to root level"})
            
        # Otherwise move under the specified parent
        try:
            new_parent = Category.objects.get(
                id=new_parent_id,
                organization=get_user_organization(request.user)
            )
            
            # Prevent circular references
            if new_parent.is_descendant_of(category):
                return Response(
                    {"error": "Cannot move a category to its own descendant"},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            category.parent = new_parent
            category.save()
            return Response({"status": "Category moved successfully"})
            
        except Category.DoesNotExist:
            return Response(
                {"error": "Parent category not found"},
                status=status.HTTP_404_NOT_FOUND
            ) 