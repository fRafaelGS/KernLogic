from rest_framework import serializers
from products.models import ProductEvent
from .models import FactProductAttribute

class EnrichmentVelocitySerializer(serializers.Serializer):
    date = serializers.DateField()
    count = serializers.IntegerField()

class LocaleStatSerializer(serializers.Serializer):
    locale = serializers.CharField()
    translated_pct = serializers.FloatField()
    total_attributes = serializers.IntegerField()
    translated_attributes = serializers.IntegerField()

class CompletenessAttributeSerializer(serializers.Serializer):
    name = serializers.CharField()
    completed = serializers.IntegerField()
    total = serializers.IntegerField()

class CompletenessCategorySerializer(serializers.Serializer):
    name = serializers.CharField()
    value = serializers.FloatField()

class CompletenessReportSerializer(serializers.Serializer):
    overall = serializers.FloatField()
    byAttribute = CompletenessAttributeSerializer(many=True)
    byCategory = CompletenessCategorySerializer(many=True)

class ReadinessChannelSerializer(serializers.Serializer):
    name = serializers.CharField()
    value = serializers.FloatField()

class ReadinessFieldSerializer(serializers.Serializer):
    name = serializers.CharField()
    completed = serializers.IntegerField()
    missing = serializers.IntegerField()

class ReadinessReportSerializer(serializers.Serializer):
    overall = serializers.FloatField()
    byChannel = ReadinessChannelSerializer(many=True)
    byRequiredField = ReadinessFieldSerializer(many=True)

class ChangeHistorySerializer(serializers.ModelSerializer):
    username = serializers.SerializerMethodField()
    entity_type = serializers.CharField(source='event_type')
    entity_id = serializers.IntegerField(source='product_id')
    action = serializers.SerializerMethodField()
    details = serializers.SerializerMethodField()
    date = serializers.DateTimeField(source='created_at')

    class Meta:
        model = ProductEvent
        fields = ['id', 'date', 'username', 'entity_type', 'entity_id', 'action', 'details']

    def get_username(self, obj):
        if obj.created_by:
            return obj.created_by.username
        return 'System'

    def get_action(self, obj):
        if obj.event_type.startswith('attribute_'):
            return 'attribute_update'
        return obj.event_type

    def get_details(self, obj):
        return obj.summary

class LocaleStatsSerializer(serializers.Serializer):
    """Serializer for per-locale statistics"""
    locale = serializers.CharField()
    total_attributes = serializers.IntegerField()
    translated_attributes = serializers.IntegerField()
    translated_pct = serializers.FloatField()

class OverallStatsSerializer(serializers.Serializer):
    """Serializer for overall statistics across all locales"""
    total_attributes = serializers.IntegerField()
    translated_attributes = serializers.IntegerField()
    translated_pct = serializers.FloatField()

class LocalizationQualitySerializer(serializers.Serializer):
    """Serializer for the localization quality endpoint response"""
    overall = OverallStatsSerializer()
    locale_stats = LocaleStatsSerializer(many=True) 