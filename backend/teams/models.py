from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

def get_default_org():
    from organizations.models import Organization
    default_org, _ = Organization.objects.get_or_create(name="Default")
    return default_org.id

class Role(models.Model):
    name = models.CharField(max_length=50)
    description = models.TextField(blank=True)
    permissions = models.JSONField(default=list, blank=True)
    organization = models.ForeignKey(
        "organizations.Organization", 
        on_delete=models.CASCADE,
        related_name="roles",
        null=True,
        blank=True
    )

    class Meta:
        # Each role name must be unique within an organization
        unique_together = [["name", "organization"]]

    def __str__(self):
        org_name = self.organization.name if self.organization else "Global"
        return f"{self.name} ({org_name})"

class Membership(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("active", "Active"),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="teams_memberships")
    organization = models.ForeignKey(
        "organizations.Organization", 
        on_delete=models.CASCADE,
        default=get_default_org
    )
    role = models.ForeignKey(Role, on_delete=models.PROTECT)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="pending")
    invited_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [["user", "organization"]]

    def __str__(self):
        return f"{self.user.email} in {self.organization.name} as {self.role.name}"

class AuditLog(models.Model):
    ACTION_CHOICES = [
        ("invite", "Invite Sent"),
        ("role_change", "Role Changed"),
        ("remove", "User Removed"),
    ]
    user = models.ForeignKey(User, null=True, on_delete=models.SET_NULL)
    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE, null=True)
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    target_type = models.CharField(max_length=50)   # e.g. "Membership"
    target_id = models.UUIDField()                  # e.g. membership.pk
    timestamp = models.DateTimeField(auto_now_add=True)
    details = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return f"{self.action} by {self.user} on {self.timestamp}"
