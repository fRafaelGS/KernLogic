from django.shortcuts import render
from django.db import models
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Role, Membership, AuditLog
from .serializers import RoleSerializer, MembershipSerializer, AuditLogSerializer, MembershipAcceptSerializer
from django.conf import settings
from django.contrib.auth import get_user_model
from .permissions import (
    IsOrgAdmin, 
    IsTeamReadOnly, 
    HasTeamViewPermission, 
    HasTeamInvitePermission,
    HasTeamChangeRolePermission,
    HasTeamRemovePermission
)
import uuid
from django.utils.crypto import get_random_string
from .utils import send_invitation_email, mock_send_invitation_email
from accounts.views import get_tokens_for_user

User = get_user_model()

# Create your views here.

class RoleViewSet(viewsets.ModelViewSet):
    serializer_class = RoleSerializer
    
    def get_permissions(self):
        """
        Return permissions based on the action:
        - list, retrieve: team.view permission
        - create, update, delete: team.change_role permission
        """
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated(), HasTeamViewPermission()]
        else:
            return [permissions.IsAuthenticated(), HasTeamChangeRolePermission()]
    
    def get_queryset(self):
        """
        Return roles for a specific organization
        """
        org_id = self.kwargs.get('org_id')
        if not org_id:
            return Role.objects.none()
            
        # Filter roles by organization
        return Role.objects.filter(organization_id=org_id)

class MembershipViewSet(viewsets.ModelViewSet):
    queryset = Membership.objects.all()
    serializer_class = MembershipSerializer
    
    # Add action-specific permissions
    def get_permissions(self):
        """
        Return permissions based on the action:
        - check_invitation, accept: allow any (public endpoints)
        - list, retrieve: team.view permission
        - create, resend_invite: team.invite permission
        - partial_update: team.change_role permission
        - destroy: team.remove permission
        """
        if self.action in ['check_invitation', 'accept']:
            return [permissions.AllowAny()]
            
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated(), HasTeamViewPermission()]
            
        if self.action in ['create', 'resend_invite']:
            return [permissions.IsAuthenticated(), HasTeamInvitePermission()]
            
        if self.action in ['partial_update']:
            return [permissions.IsAuthenticated(), HasTeamChangeRolePermission()]
            
        if self.action in ['destroy']:
            return [permissions.IsAuthenticated(), HasTeamRemovePermission()]
            
        # Default to requiring authentication
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        org_id = self.kwargs["org_id"]
        
        # All org IDs are now UUIDs
        queryset = super().get_queryset().filter(organization_id=org_id)
        
        # Apply search and filter params
        search = self.request.query_params.get('search', None)
        role = self.request.query_params.get('role', None)
        status = self.request.query_params.get('status', None)
        
        if search:
            queryset = queryset.filter(
                models.Q(user__name__icontains=search) | 
                models.Q(user__email__icontains=search)
            )
        
        if role:
            queryset = queryset.filter(role__name=role)
            
        if status:
            queryset = queryset.filter(status=status)
            
        return queryset

    def create(self, request, *args, **kwargs):
        """
        Invite a user to the organization. If user doesn't exist, creates the account.
        
        Expected payload:
        {
            "email": "user@example.com",
            "role_id": 1
        }
        """
        org_id = self.kwargs["org_id"]
        email = request.data.get('email')
        role_id = request.data.get('role_id')
        
        # Validate required fields
        if not email:
            return Response({"error": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)
        if not role_id:
            return Response({"error": "Role ID is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        # Get role
        try:
            role = Role.objects.get(id=role_id)
        except Role.DoesNotExist:
            return Response({"error": f"Role with ID {role_id} does not exist"}, 
                            status=status.HTTP_400_BAD_REQUEST)
        
        # Check if user already exists
        user = User.objects.filter(email=email).first()
        
        if not user:
            # Create new user with a random temporary password
            # In production, you should send a password reset link instead
            temp_password = get_random_string(12)
            user = User.objects.create_user(
                email=email,
                username=email,  # Assuming username is required
                password=temp_password,
                is_active=True
            )
            
            # TODO: Send email with password reset link
            # For now, just log the temp password for testing
            print(f"Created user {email} with temporary password: {temp_password}")
        
        # Get the organization from org_id (now UUID)
        from organizations.models import Organization
        try:
            organization = Organization.objects.get(id=org_id)
        except Organization.DoesNotExist:
            return Response(
                {"error": f"Organization with ID {org_id} does not exist"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if membership already exists
        existing = Membership.objects.filter(user=user, organization=organization).first()
        if existing:
            # If already active, return error
            if existing.status == 'active':
                return Response(
                    {"error": f"User {email} is already a member of this organization"},
                    status=status.HTTP_409_CONFLICT
                )
            # If pending, update the role if needed
            if existing.role.id != role.id:
                existing.role = role
                existing.save()
            
            # Always resend invitation email for pending memberships
            if existing.status == 'pending':
                # Create audit log entry for resending invite
                AuditLog.objects.create(
                    user=request.user,
                    organization=organization,
                    action="invite",
                    target_type="Membership",
                    target_id=existing.pk,
                    details={"message": "Invite resent via create endpoint"}
                )
                
                # Send invitation email
                if hasattr(settings, 'EMAIL_DEBUG') and settings.EMAIL_DEBUG:
                    mock_send_invitation_email(existing, request.user.get_full_name() or request.user.email)
                else:
                    send_invitation_email(existing, request.user.get_full_name() or request.user.email)
                
            serializer = self.get_serializer(existing)
            return Response(serializer.data, status=status.HTTP_200_OK)
        
        # Create new membership with numeric organization ID
        membership = Membership.objects.create(
            user=user,
            organization=organization,
            role=role,
            status='pending'  # Always start as pending
        )
        
        # Create audit log
        AuditLog.objects.create(
            user=request.user,
            organization=organization,
            action='invite',
            target_type='Membership',
            target_id=membership.pk,
            details={
                'email': email,
                'role': role.name
            }
        )
        
        # Send invitation email
        # Use real email unless EMAIL_DEBUG is True (instead of using DEBUG)
        if hasattr(settings, 'EMAIL_DEBUG') and settings.EMAIL_DEBUG:
            mock_send_invitation_email(membership, request.user.get_full_name() or request.user.email)
        else:
            send_invitation_email(membership, request.user.get_full_name() or request.user.email)
        
        serializer = self.get_serializer(membership)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        """Update a membership (e.g., change role) and log the change"""
        membership = self.get_object()
        old_role = membership.role.name
        
        response = super().partial_update(request, *args, **kwargs)
        
        # Check if role was changed
        membership.refresh_from_db()
        new_role = membership.role.name
        
        if old_role != new_role:
            # Use organization.id directly (now a UUID)
            org_id = membership.organization.id
            
            AuditLog.objects.create(
                user=request.user,
                organization=membership.organization,
                action='role_change',
                target_type='Membership',
                target_id=membership.pk,
                details={
                    'from': old_role,
                    'to': new_role
                }
            )
        
        return response

    def destroy(self, request, *args, **kwargs):
        """Remove a membership and log the action"""
        membership = self.get_object()
        
        # Use the organization.id directly (now a UUID)
        org_id = membership.organization.id
        
        # Create audit log before deletion
        AuditLog.objects.create(
            user=request.user,
            organization=membership.organization,
            action='remove',
            target_type='Membership',
            target_id=membership.pk,
            details={
                'email': membership.user.email,
                'role': membership.role.name,
                'status': membership.status
            }
        )
        
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=["get"])
    def invites(self, request, org_id=None):
        pending = self.get_queryset().filter(status="pending")
        serializer = self.get_serializer(pending, many=True)
        return Response(serializer.data)
        
    @action(detail=True, methods=["post"])
    def resend_invite(self, request, pk=None, org_id=None):
        membership = self.get_object()
        
        # Only allow resending if the membership is still pending
        if membership.status != "pending":
            return Response({"detail": "Can only resend invites for pending memberships"}, status=400)
        
        # Use organization.id directly (now a UUID)
        org_id = membership.organization.id
        
        # Create audit log entry for resending invite
        AuditLog.objects.create(
            user=request.user,
            organization=membership.organization,
            action="invite",
            target_type="Membership",
            target_id=membership.pk,
            details={"message": "Invite resent"}
        )
        
        # Send invitation email
        if hasattr(settings, 'EMAIL_DEBUG') and settings.EMAIL_DEBUG:
            mock_send_invitation_email(membership, request.user.get_full_name() or request.user.email)
        else:
            send_invitation_email(membership, request.user.get_full_name() or request.user.email)
        
        return Response({"status": "invite_resent"})
        
    @action(detail=True, methods=["post"])
    def accept(self, request, pk=None, org_id=None):
        """
        Accept an invitation to join an organization.
        
        Expected payload:
        {
            "name": "Full Name",
            "password": "securepassword",
            "password_confirm": "securepassword",
            "invitation_token": "token"
        }
        """
        membership = self.get_object()
        
        # Check if the membership is in pending status
        if membership.status != 'pending':
            return Response(
                {"error": "This invitation has already been accepted or is invalid"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate data with the serializer
        serializer = MembershipAcceptSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # Get validated data
        name = serializer.validated_data['name']
        password = serializer.validated_data['password']
        invitation_token = serializer.validated_data['invitation_token']
        
        # Verify the invitation token matches
        # In a real app, you'd hash and compare these securely
        if invitation_token != str(membership.id):  # Simple validation for demonstration
            return Response(
                {"error": "Invalid invitation token"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get or create the user
        user = membership.user
        
        # Update user details
        user.name = name
        user.set_password(password)
        user.save()
        
        # Activate the membership
        membership.status = 'active'
        membership.save()
        
        # Create audit log
        AuditLog.objects.create(
            user=user,
            organization=membership.organization,
            action='invite',
            target_type='Membership',
            target_id=membership.pk,
            details={
                'message': 'Invitation accepted'
            }
        )
        
        # Generate auth tokens
        tokens = get_tokens_for_user(user)
        
        # Return user and tokens
        from accounts.serializers import UserSerializer
        user_data = UserSerializer(user).data
        
        return Response({
            'user': user_data,
            'access': tokens['access'],
            'refresh': tokens['refresh']
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"])
    def check_invitation(self, request, pk=None, org_id=None):
        """
        Check if an invitation is valid without requiring authentication.
        Used when a user follows an invitation link to verify the email and determine next steps.
        """
        try:
            # Get the membership without requiring authentication
            membership = Membership.objects.get(pk=pk)
            
            # Get basic information to return (limited for security)
            user_data = {
                'email': membership.user.email
            }
            
            org_data = {
                'id': str(membership.organization.id),  # Ensure UUID is converted to string
                'name': membership.organization.name
            }
            
            # Check if this is likely a new user (no last login)
            is_new_user = membership.user.last_login is None
            
            # Return limited data
            return Response({
                'id': membership.id,
                'status': membership.status,
                'user': user_data,
                'organization': org_data,
                'is_new_user': is_new_user
            })
        except Membership.DoesNotExist:
            return Response(
                {"detail": "Invitation not found or has expired."},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {"detail": f"Error checking invitation: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)
        
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, context={'request': request})
        return Response(serializer.data)

class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    
    def get_permissions(self):
        """
        Return team.view permission for all audit log views
        """
        return [permissions.IsAuthenticated(), HasTeamViewPermission()]

    def get_queryset(self):
        org_id = self.kwargs["org_id"]
        return super().get_queryset().filter(organization__id=org_id).order_by('-timestamp')
