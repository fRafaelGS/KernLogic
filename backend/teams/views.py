from django.shortcuts import render
from django.db import models
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Role, Membership, AuditLog
from .serializers import RoleSerializer, MembershipSerializer, AuditLogSerializer
from django.conf import settings
from django.contrib.auth import get_user_model
from .permissions import IsOrgAdmin, IsTeamReadOnly
import uuid
from django.utils.crypto import get_random_string
from .utils import send_invitation_email, mock_send_invitation_email

User = get_user_model()

# Create your views here.

class RoleViewSet(viewsets.ModelViewSet):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [permissions.IsAuthenticated, IsOrgAdmin]

class MembershipViewSet(viewsets.ModelViewSet):
    queryset = Membership.objects.all()
    serializer_class = MembershipSerializer
    permission_classes = [permissions.IsAuthenticated, IsTeamReadOnly]

    def get_queryset(self):
        org_id = self.kwargs["org_id"]
        queryset = super().get_queryset().filter(org_id=org_id)
        
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
        
        # Check if membership already exists
        existing = Membership.objects.filter(user=user, org_id=org_id).first()
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
                
            serializer = self.get_serializer(existing)
            return Response(serializer.data, status=status.HTTP_200_OK)
        
        # Create new membership
        membership = Membership.objects.create(
            user=user,
            org_id=org_id,
            role=role,
            status='pending'  # Always start as pending
        )
        
        # Create audit log
        AuditLog.objects.create(
            user=request.user,
            org_id=org_id,
            action='invite',
            target_type='Membership',
            target_id=membership.pk,
            details={
                'email': email,
                'role': role.name
            }
        )
        
        # Send invitation email
        # Use real email in production, mock for development
        if settings.DEBUG:
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
            AuditLog.objects.create(
                user=request.user,
                org_id=membership.org_id,
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
        
        # Create audit log before deletion
        AuditLog.objects.create(
            user=request.user,
            org_id=membership.org_id,
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
        
        # Create audit log entry for resending invite
        AuditLog.objects.create(
            user=request.user,
            org_id=org_id,
            action="invite",
            target_type="Membership",
            target_id=membership.pk,
            details={"message": "Invite resent"}
        )
        
        # Send invitation email
        if settings.DEBUG:
            mock_send_invitation_email(membership, request.user.get_full_name() or request.user.email)
        else:
            send_invitation_email(membership, request.user.get_full_name() or request.user.email)
        
        return Response({"status": "invite_resent"})
        
    @action(detail=True, methods=["post"])
    def accept(self, request, pk=None, org_id=None):
        """
        Accept an invitation.
        This would typically be called after a user clicks a link in an invitation email.
        """
        membership = self.get_object()
        
        # Only pending invitations can be accepted
        if membership.status != "pending":
            return Response({"detail": "This invitation has already been processed"}, 
                           status=status.HTTP_400_BAD_REQUEST)
        
        # Verify the user is accepting their own invitation
        if membership.user != request.user:
            return Response({"detail": "You can only accept your own invitations"}, 
                           status=status.HTTP_403_FORBIDDEN)
        
        # Update status to active
        membership.status = "active"
        membership.save()
        
        # Create audit log
        AuditLog.objects.create(
            user=request.user,
            org_id=org_id,
            action="accept_invite",
            target_type="Membership",
            target_id=membership.pk,
            details={"role": membership.role.name}
        )
        
        serializer = self.get_serializer(membership)
        return Response(serializer.data)

class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated, IsTeamReadOnly]

    def get_queryset(self):
        org_id = self.kwargs["org_id"]
        return super().get_queryset().filter(org_id=org_id).order_by('-timestamp')
