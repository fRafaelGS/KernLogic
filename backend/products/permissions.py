from rest_framework import permissions

class IsStaffOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow staff users to edit objects.
    Regular users can only view.
    
    IMPORTANT: Ensure that tenant admin accounts have is_staff=True
    so they can create and edit attributes through the UI.
    This is critical for the Attributes feature to work properly.
    """
    
    def has_permission(self, request, view):
        # Read permissions are allowed to any request
        if request.method in permissions.SAFE_METHODS:
            return True
            
        # Write permissions are only allowed to staff
        return request.user and request.user.is_staff 