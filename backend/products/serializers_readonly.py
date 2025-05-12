from rest_framework import serializers
from django.utils import timezone
from .models import Product, Activity, ProductEvent

# We'll use existing related models as placeholders since the actual models don't exist
# This lets us return empty lists instead of 404s which works better for the frontend
class ProductAttributeValueSerializer(serializers.Serializer):
    id = serializers.IntegerField(default=0)
    product_id = serializers.IntegerField()
    name = serializers.CharField(default="")
    value = serializers.CharField(default="")
    group = serializers.CharField(default="")
    locale = serializers.CharField(default="en")
    updated_at = serializers.DateTimeField(default=timezone.now)
    isMandatory = serializers.BooleanField(default=False)

class ProductActivitySerializer(serializers.ModelSerializer):
    # Reuse the existing Activity model and adapt it
    type = serializers.CharField(source='action')
    user = serializers.CharField(source='user.username')
    timestamp = serializers.DateTimeField(source='created_at')
    details = serializers.CharField(source='message')
    
    class Meta:
        model = Activity
        fields = ['id', 'type', 'user', 'timestamp', 'details']

# Deprecated: ProductPriceHistorySerializer has been removed
# Use ProductEventSerializer instead

# Deprecated: ProductVersionSerializer has been removed
# Use ProductEventSerializer instead

class AttributeSetSerializer(serializers.Serializer):
    # Basic template for attribute sets
    id = serializers.IntegerField()
    name = serializers.CharField(default="Default Set")
    attributes = serializers.ListField(default=list)
    description = serializers.CharField(default="") 