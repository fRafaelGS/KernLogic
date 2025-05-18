from rest_framework import serializers
from .models import ImportTask


class ImportTaskSerializer(serializers.ModelSerializer):
    """
    Serializer for the ImportTask model.
    Includes calculated fields for progress percentage and status display.
    """
    progress_percentage = serializers.IntegerField(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    error_file_url = serializers.SerializerMethodField()
    error_count = serializers.IntegerField(read_only=True, default=0, help_text="Number of rows with errors")
    row_count = serializers.IntegerField(source='total_rows', read_only=True)
    
    class Meta:
        model = ImportTask
        fields = [
            "id", 
            "csv_file", 
            "mapping", 
            "duplicate_strategy",
            "status", 
            "status_display",
            "processed", 
            "total_rows", 
            "row_count",
            "progress_percentage",
            "error_file", 
            "error_file_url",
            "error_count",
            "execution_time",
            "created_at"
        ]
        read_only_fields = [
            "id", 
            "status", 
            "status_display", 
            "processed", 
            "total_rows", 
            "row_count",
            "progress_percentage",
            "error_file", 
            "error_file_url",
            "error_count",
            "execution_time",
            "created_at"
        ]
    
    def get_error_file_url(self, obj):
        """Return the URL for the error file if it exists."""
        if obj.error_file:
            request = self.context.get('request')
            if request is not None:
                return request.build_absolute_uri(obj.error_file.url)
            return obj.error_file.url
        return None 