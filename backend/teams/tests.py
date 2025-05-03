from django.test import TestCase
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from .models import Role, Membership, AuditLog
import uuid

User = get_user_model()

class TeamsPhase1Tests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user("admin@example.com", password="pass", is_staff=True)
        self.client.force_authenticate(self.admin)
        self.role = Role.objects.create(name="Admin")
        self.org_id = uuid.uuid4()

    def test_list_roles(self):
        response = self.client.get("/api/teams/roles/")
        self.assertEqual(response.status_code, 200)
    
    def test_create_membership(self):
        membership = Membership.objects.create(
            user=self.admin,
            org_id=self.org_id,
            role=self.role,
            status="active"
        )
        self.assertEqual(membership.user, self.admin)
        self.assertEqual(membership.role, self.role)
    
    def test_create_audit_log(self):
        target_id = uuid.uuid4()
        audit = AuditLog.objects.create(
            user=self.admin,
            org_id=self.org_id,
            action="invite",
            target_type="Membership",
            target_id=target_id
        )
        self.assertEqual(audit.user, self.admin)
        self.assertEqual(audit.action, "invite")

class TeamPermissionsTest(TestCase):
    def setUp(self):
        # Create users
        self.admin_user = User.objects.create_user(
            "admin@example.com", password="pass", is_staff=True
        )
        self.regular_user = User.objects.create_user(
            "user@example.com", password="pass", is_staff=False
        )
        
        # Create roles
        self.admin_role = Role.objects.create(name="Admin")
        self.viewer_role = Role.objects.create(name="Viewer")
        
        # Create test organization ID
        self.org_id = uuid.uuid4()
        
        # Create memberships
        self.admin_membership = Membership.objects.create(
            user=self.admin_user,
            org_id=self.org_id,
            role=self.admin_role,
            status="active"
        )
        
        self.viewer_membership = Membership.objects.create(
            user=self.regular_user,
            org_id=self.org_id,
            role=self.viewer_role,
            status="active"
        )
        
        # Setup API clients
        self.admin_client = APIClient()
        self.admin_client.force_authenticate(self.admin_user)
        
        self.user_client = APIClient()
        self.user_client.force_authenticate(self.regular_user)

    def test_admin_can_list_members(self):
        """Admin can list team members"""
        response = self.admin_client.get(f"/api/teams/orgs/{self.org_id}/members/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 2)  # Two memberships

    def test_viewer_can_list_members(self):
        """Regular user can list team members (read-only permission)"""
        response = self.user_client.get(f"/api/teams/orgs/{self.org_id}/members/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 2)  # Two memberships

    def test_viewer_cannot_invite(self):
        """Regular user cannot invite new members"""
        new_user = User.objects.create_user("new@example.com", password="pass")
        
        data = {
            "user": new_user.id,
            "role_id": self.viewer_role.id
        }
        
        response = self.user_client.post(f"/api/teams/orgs/{self.org_id}/members/", data)
        self.assertEqual(response.status_code, 403)  # Forbidden
        
    def test_viewer_cannot_change_role(self):
        """Regular user cannot change member roles"""
        response = self.user_client.patch(
            f"/api/teams/orgs/{self.org_id}/members/{self.viewer_membership.id}/",
            {"role_id": self.admin_role.id}
        )
        self.assertEqual(response.status_code, 403)  # Forbidden

    def test_admin_can_invite_and_logs(self):
        """Admin can invite members and the action is logged"""
        new_user = User.objects.create_user("new@example.com", password="pass")
        
        initial_logs_count = AuditLog.objects.count()
        
        data = {
            "user": new_user.id,
            "role_id": self.viewer_role.id
        }
        
        response = self.admin_client.post(f"/api/teams/orgs/{self.org_id}/members/", data)
        self.assertEqual(response.status_code, 201)  # Created
        
        # Check that an audit log was created
        self.assertEqual(AuditLog.objects.count(), initial_logs_count + 1)
        log = AuditLog.objects.last()
        self.assertEqual(log.action, "invite")
        self.assertEqual(log.user, self.admin_user)

    def test_admin_can_change_role_and_logs(self):
        """Admin can change roles and the action is logged"""
        initial_logs_count = AuditLog.objects.count()
        
        response = self.admin_client.patch(
            f"/api/teams/orgs/{self.org_id}/members/{self.viewer_membership.id}/",
            {"role_id": self.admin_role.id}
        )
        self.assertEqual(response.status_code, 200)
        
        # Check that the role was updated
        self.viewer_membership.refresh_from_db()
        self.assertEqual(self.viewer_membership.role, self.admin_role)
        
        # Check that an audit log was created
        self.assertEqual(AuditLog.objects.count(), initial_logs_count + 1)
        log = AuditLog.objects.last()
        self.assertEqual(log.action, "role_change")
        self.assertEqual(log.details.get("from"), "Viewer")
        self.assertEqual(log.details.get("to"), "Admin")
