from django.contrib import admin
from .models import Organization

@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ('id', 'uuid', 'name', 'created_at')
    search_fields = ('name',)
    ordering = ('name',)
