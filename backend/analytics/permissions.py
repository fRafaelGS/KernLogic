from rest_framework import permissions

class AnalyticsReportPermission(permissions.BasePermission):
    """
    Custom permission for analytics reports
    """
    def has_permission(self, request, view):
        # Maintain proper authentication for all endpoints
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        # Implement object-level permission logic
        # This method is not implemented in the original file or the new one
        return False

    def has_module_permission(self, request, obj=None):
        # Implement module-level permission logic
        # This method is not implemented in the original file or the new one
        return False 