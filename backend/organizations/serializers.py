from rest_framework import serializers
from products.models import SalesChannel, Locale
from products.serializers import SalesChannelSerializer, LocaleSerializer
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
    
    # Add serializer field for default_locale_ref
    default_locale_ref = LocaleSerializer(read_only=True)
    default_locale_ref_id = serializers.PrimaryKeyRelatedField(
        source='default_locale_ref', 
        queryset=Locale.objects.all(), 
        write_only=True,
        required=False,
        allow_null=True
    )
    
    class Meta:
        model = Organization
        fields = [
            'id', 'name', 'created_at',
            'default_locale', 
            'default_locale_ref', 'default_locale_ref_id',
            'default_channel', 'default_channel_id',
        ]
        read_only_fields = ['id', 'created_at']
        
    def validate_default_locale(self, value):
        """
        Check that the default_locale is valid.
        """
        # Get the organization if this is an update
        organization = None
        if self.instance:
            organization = self.instance
            
        # Check if there's a matching Locale in the database
        locale_exists = Locale.objects.filter(code=value, organization=organization).exists()
        
        # If not, check if it's at least in the LOCALES list (valid choice)
        if not locale_exists:
            from .models import LOCALES
            valid_choices = [code for code, _ in LOCALES]
            if value not in valid_choices:
                raise serializers.ValidationError(f"'{value}' is not a valid choice.")
                
        return value
        
    def update(self, instance, validated_data):
        """
        Update both default_locale and default_locale_ref if one changes.
        Also handle default_channel updates by code.
        """
        # If default_locale_ref is updated, also update default_locale
        if 'default_locale_ref' in validated_data and validated_data['default_locale_ref']:
            instance.default_locale = validated_data['default_locale_ref'].code
        
        # If default_locale is updated by code, also update default_locale_ref
        locale_code = validated_data.get("default_locale")
        if locale_code:
            locale_obj = Locale.objects.filter(code=locale_code, 
                                              organization=instance).first()
            instance.default_locale = locale_code
            instance.default_locale_ref = locale_obj  # Set the FK reference
        
        # Handle channel updates by code (for legacy API compatibility)
        channel_code = validated_data.get("default_channel")
        if channel_code and isinstance(channel_code, str):
            ch_obj = SalesChannel.objects.filter(code=channel_code,
                                               organization=instance).first()
            if ch_obj:
                validated_data['default_channel'] = ch_obj  # Update with FK object
        
        return super().update(instance, validated_data) 