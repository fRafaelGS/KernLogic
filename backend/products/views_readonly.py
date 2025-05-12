from rest_framework import mixins, viewsets, response
from django.shortcuts import get_object_or_404
from .models import Product, Activity, ProductEvent
from .serializers_readonly import (
    ProductAttributeValueSerializer,
    ProductActivitySerializer,
    AttributeSetSerializer,
)

class AttributeValueViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    serializer_class = ProductAttributeValueSerializer

    def get_queryset(self):
        # Since we don't have a real model, return an empty list
        # The serializer will handle it
        return []
    
    def list(self, request, *args, **kwargs):
        # Get the product or return 404
        product = get_object_or_404(Product, pk=self.kwargs["product_pk"])
        
        # Return empty list (in the future this could be populated with real data)
        return response.Response([])

class ActivityViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    serializer_class = ProductActivitySerializer

    def get_queryset(self):
        # Filter activities related to this product
        # We're using the Activity model which is close enough
        product_id = self.kwargs["product_pk"]
        return Activity.objects.filter(entity='product', entity_id=product_id)

class AttributeSetViewSet(mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    # For attribute sets, we'll need to handle this manually
    def retrieve(self, request, *args, **kwargs):
        # Get the ID from the URL
        set_id = kwargs.get('pk')
        
        # Create a dummy attribute set
        data = {
            'id': int(set_id),
            'name': f"Attribute Set {set_id}",
            'attributes': [],
            'description': "This is a placeholder attribute set"
        }
        
        serializer = AttributeSetSerializer(data)
        return response.Response(serializer.data) 