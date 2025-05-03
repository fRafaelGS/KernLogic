from rest_framework import permissions
from .models import Membership
from organizations.models import Organization

class IsOrgAdmin(permissions.BasePermission):
    """
    Only allow users with an active Admin membership in this org.
    """

    def has_permission(self, request, view):
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
            
        # Look up by organization_id
        is_member = Membership.objects.filter(
            user=request.user,
            organization_id=org_id,
            status='active'
        ).exists()
        
        if request.method in permissions.SAFE_METHODS:
            return is_member
            
        # Non-safe methods (POST, PATCH, DELETE) require Admin role
        return IsOrgAdmin().has_permission(request, view) 