from rest_framework import serializers
from products.models import SalesChannel
from products.serializers import SalesChannelSerializer
from .models import Organization

class OrganizationSerializer(serializers.ModelSerializer):
    default_channel = SalesChannelSerializer(read_only=True)
    default_channel_id = serializers.PrimaryKeyRelatedField(
        source='default_channel', 
        queryset=SalesChannel.objects.all(), 
        write_only=True,
        required=False,
        allow_null=True
    )
    
    class Meta:
        model = Organization
        fields = [
            'id', 'name', 'created_at',
            'default_locale', 
            'default_channel',
            'default_channel_id',
        ]
        read_only_fields = ['id', 'created_at'] 