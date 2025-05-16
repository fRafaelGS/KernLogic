from .models import (
    Product, ProductAsset, Activity, ProductRelation, Attribute, AttributeValue, 
    AttributeGroup, AttributeGroupItem, SalesChannel, ProductPrice, Category,
    AssetBundle, Family, FamilyAttributeGroup, Locale
)
from .serializers import (
    ProductSerializer, ProductListSerializer, ProductImageSerializer, 
    ActivitySerializer, ProductRelationSerializer, RelatedProductSerializer,
    ProductAssetSerializer, ProductEventSerializer, AttributeSerializer,
    AttributeValueSerializer, AttributeGroupSerializer, AttributeGroupItemSerializer,
    SalesChannelSerializer, ProductPriceSerializer, AssetBundleSerializer,
    FamilySerializer, FamilyAttributeGroupSerializer, AttributeOptionSerializer,
    CategorySerializer, LocaleSerializer
)

class LocaleViewSet(viewsets.ModelViewSet):
    """
    API endpoint for organization locales
    """
    serializer_class = LocaleSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """
        Filter locales by the user's organization
        """
        user = self.request.user
        organization = get_user_organization(user)
        
        # Filter by organization
        return Locale.objects.filter(organization=organization)
    
    def perform_create(self, serializer):
        """
        Set the organization when creating a new locale
        """
        user = self.request.user
        organization = get_user_organization(user)
        serializer.save(organization=organization) 