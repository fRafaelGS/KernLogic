from rest_framework import permissions
from .models import Membership
from organizations.models import Organization

class HasPermission(permissions.BasePermission):
    """
    Check if user has the required permission based on their role
    """
    required_permission = None  # Override in subclasses
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
            
        # Staff always has permission
        if request.user.is_staff:
            return True
            
        # Get the organization ID from the URL
        org_id = view.kwargs.get('org_id')
        if not org_id:
            return False
            
        # Find user's active membership for this organization
        membership = Membership.objects.filter(
            user=request.user,
            organization_id=org_id,
            status='active'
        ).select_related('role').first()
        
        if not membership:
            return False
            
        # Check if user has required permission
        if not self.required_permission:
            return False
            
        return self.required_permission in membership.role.permissions

class HasProductViewPermission(HasPermission):
    required_permission = "product.view"
    
class HasProductAddPermission(HasPermission):
    required_permission = "product.add"
    
class HasProductChangePermission(HasPermission):
    required_permission = "product.change"
    
class HasProductDeletePermission(HasPermission):
    required_permission = "product.delete"
    
class HasTeamViewPermission(HasPermission):
    required_permission = "team.view"
    
class HasTeamInvitePermission(HasPermission):
    required_permission = "team.invite"
    
class HasTeamChangeRolePermission(HasPermission):
    required_permission = "team.change_role"
    
class HasTeamRemovePermission(HasPermission):
    required_permission = "team.remove"
    
class HasDashboardViewPermission(HasPermission):
    required_permission = "dashboard.view"

class IsOrgAdmin(permissions.BasePermission):
    """
    Only allow users with an active Admin membership in this org.
    """

    def has_permission(self, request, view):
        # Staff always has Admin permissions
        if request.user.is_staff:
            return True
            
        org_id = view.kwargs.get('org_id')
        if not org_id:
            return False
            
        # Look up by organization_id
        return Membership.objects.filter(
            user=request.user,
            organization_id=org_id,
            role__name='Admin',
            status='active'
        ).exists()

class IsTeamReadOnly(permissions.BasePermission):
    """
    Allow read-only for any active member; write only for Admin.
    """

    def has_permission(self, request, view):
        org_id = view.kwargs.get('org_id')
        if not org_id:
            return False
            
        # Staff always has permission
        if request.user.is_staff:
            return True
            
        # Look up by organization_id
        membership = Membership.objects.filter(
            user=request.user,
            organization_id=org_id,
            status='active'
        ).select_related('role').first()
        
        if not membership:
            return False
            
        if request.method in permissions.SAFE_METHODS:
            # For read operations, check if user has team.view permission
            return "team.view" in membership.role.permissions
            
        # For write operations, check if user is an Admin
        return membership.role.name == 'Admin' 