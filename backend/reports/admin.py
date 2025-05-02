from django.contrib import admin
from .models import ReportTheme

@admin.register(ReportTheme)
class ReportThemeAdmin(admin.ModelAdmin):
    list_display = ('slug', 'name', 'created_at')
    ordering = ('name',)
