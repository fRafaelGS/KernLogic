import uuid
from django.db import models
from django.conf import settings

class Organization(models.Model):
    """
    Organization model - represents a tenant in the system
    """
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=120, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.name

class Role(models.Model):
    """
    Role model - represents a role in an organization with specific permissions
    """
    name = models.CharField(max_length=50)
    description = models.TextField(blank=True)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="roles")
    permissions = models.JSONField(default=dict)
    
    def __str__(self):
        return f"{self.name} ({self.organization.name})"

class Membership(models.Model):
    """
    Membership model - represents the relationship between a user and an organization
    """
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('active', 'Active'),
    )
    
    org = models.ForeignKey(Organization, related_name='orgs_memberships', on_delete=models.CASCADE)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='orgs_memberships', on_delete=models.CASCADE)
    role = models.ForeignKey(Role, related_name='memberships', on_delete=models.SET_NULL, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    invited_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('org', 'user')
        
    def __str__(self):
        return f"{self.user} in {self.org.name} as {self.role.name if self.role else 'No role'}" 