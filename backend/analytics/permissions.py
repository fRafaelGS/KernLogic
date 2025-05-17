from rest_framework import permissions

class AnalyticsReportPermission(permissions.BasePermission):
    """
    Permission class for access to analytics reports.
    """
    def has_permission(self, request, view):
        # Check if user is authenticated and has the right permissions
        return request.user.is_authenticated and (
            request.user.is_superuser or 
            request.user.has_perm('analytics.view_reports')
        )

    def has_object_permission(self, request, view, obj):
        # Implement object-level permission logic
        # This method is not implemented in the original file or the new one
        return False

    def has_module_permission(self, request, obj=None):
        # Implement module-level permission logic
        # This method is not implemented in the original file or the new one
        return False

class HasAnalyticsPermission(permissions.BasePermission):
    """
    Permission class for access to analytics endpoints.
    Requires user to have the 'view_analytics' permission.
    """
    def has_permission(self, request, view):
        # Check if user is authenticated and has the right permissions
        return request.user.is_authenticated and (
            request.user.is_superuser or 
            request.user.has_perm('analytics.view_analytics')
        ) 