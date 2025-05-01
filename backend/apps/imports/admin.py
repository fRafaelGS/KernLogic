from django.contrib import admin
from .models import ImportTask

@admin.register(ImportTask)
class ImportTaskAdmin(admin.ModelAdmin):
    list_display = ('id', 'status', 'processed', 'total_rows', 'created_by', 'created_at', 'organization')
    list_filter = ('status', 'organization')
    search_fields = ('created_by__email',)
    readonly_fields = ('created_at', 'execution_time', 'organization')
    fieldsets = (
        (None, {
            'fields': ('csv_file', 'mapping', 'organization', 'duplicate_strategy')
        }),
        ('Status', {
            'fields': ('status', 'processed', 'total_rows', 'execution_time', 'created_by', 'created_at')
        }),
        ('Errors', {
            'fields': ('error_file',)
        })
    ) 