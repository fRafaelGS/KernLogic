from django.contrib import admin
from .models import Role, Membership, AuditLog

@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ("name",)

@admin.register(Membership)
class MembershipAdmin(admin.ModelAdmin):
    list_display = ("user", "organization", "role", "status", "invited_at")
    list_filter = ("status", "role", "organization")
    search_fields = ("user__email", "user__username")

@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("action", "user", "timestamp")
    list_filter = ("action",)
