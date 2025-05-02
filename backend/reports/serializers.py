from rest_framework import serializers
from .models import ReportTheme

class ReportThemeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportTheme
        fields = ['slug', 'name', 'description'] 