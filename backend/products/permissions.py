from rest_framework import permissions
from teams.models import Membership

class HasProductPermission(permissions.BasePermission):
    """
    Base class for product permissions. Checks if the user has the required permission.
    """
    required_permission = None  # Override in subclasses
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
            
        # Staff always has all permissions
        if request.user.is_staff:
            return True
            
        # Find active memberships for this user
        # We'll use the organization from the user profile for products
        active_memberships = Membership.objects.filter(
            user=request.user, 
            status='active'
        ).select_related('role', 'organization')
        
        if not active_memberships:
            return False
            
        # For products, we need to check if the user has the proper permission in any org
        for membership in active_memberships:
            if self.required_permission in membership.role.permissions:
                return True
                
        return False

class HasProductViewPermission(HasProductPermission):
    required_permission = "product.view"
    
class HasProductAddPermission(HasProductPermission):
    required_permission = "product.add"
    
class HasProductChangePermission(HasProductPermission):
    required_permission = "product.change"
    
class HasProductDeletePermission(HasProductPermission):
    required_permission = "product.delete"
        
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