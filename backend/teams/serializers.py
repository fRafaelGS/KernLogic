from rest_framework import serializers
from .models import Role, Membership, AuditLog
from django.contrib.auth import get_user_model

User = get_user_model()

class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ["id", "name", "description", "permissions"]

class MembershipSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)
    role = RoleSerializer(read_only=True)
    role_id = serializers.PrimaryKeyRelatedField(queryset=Role.objects.all(), source="role")

    class Meta:
        model = Membership
        fields = ["id", "user_email", "user", "role", "role_id", "status", "invited_at"]

class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = ["id", "action", "user", "organization", "target_type", "target_id", "timestamp", "details"] 