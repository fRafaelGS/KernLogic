from rest_framework import serializers
from .models import Role, Membership, AuditLog
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError

User = get_user_model()

class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ["id", "name", "description", "permissions"]

class MembershipSerializer(serializers.ModelSerializer):
    # Include the full user object and user-related fields
    user = serializers.SerializerMethodField()
    user_email = serializers.EmailField(source="user.email", read_only=True)
    user_name = serializers.CharField(source="user.name", read_only=True)
    avatar_url = serializers.SerializerMethodField()
    role = RoleSerializer(read_only=True)
    role_id = serializers.PrimaryKeyRelatedField(queryset=Role.objects.all(), source="role")

    class Meta:
        model = Membership
        fields = ["id", "user", "user_email", "user_name", "avatar_url", "role", "role_id", "status", "invited_at", "organization"]

    def get_user(self, obj):
        from accounts.serializers import UserSerializer
        return UserSerializer(obj.user, context=self.context).data
        
    def get_avatar_url(self, obj):
        # Get the avatar URL from the user's profile
        try:
            user_id = obj.user.id
            user_email = obj.user.email
            print(f"DEBUG: get_avatar_url for user_id={user_id}, email={user_email}")
            
            has_profile = hasattr(obj.user, 'profile')
            print(f"DEBUG: user has profile: {has_profile}")
            
            if has_profile:
                has_avatar = obj.user.profile.avatar is not None
                avatar_name = obj.user.profile.avatar.name if has_avatar else "None"
                print(f"DEBUG: profile has avatar: {has_avatar}, avatar_name: {avatar_name}")
                
                if has_avatar:
                    request = self.context.get('request')
                    if request:
                        avatar_url = request.build_absolute_uri(obj.user.profile.avatar.url)
                        print(f"DEBUG: returning full avatar URL: {avatar_url}")
                        return avatar_url
                    
                    avatar_url = obj.user.profile.avatar.url
                    print(f"DEBUG: returning relative avatar URL: {avatar_url}")
                    return avatar_url
            
            print(f"DEBUG: No avatar found for user {user_id}")
            return None
        except Exception as e:
            print(f"ERROR: Exception in get_avatar_url for user {obj.user.id}: {str(e)}")
            return None

class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = ["id", "action", "user", "organization", "target_type", "target_id", "timestamp", "details"] 

class MembershipAcceptSerializer(serializers.Serializer):
    name = serializers.CharField(required=True)
    password = serializers.CharField(required=True, write_only=True, style={'input_type': 'password'})
    password_confirm = serializers.CharField(required=True, write_only=True, style={'input_type': 'password'})
    invitation_token = serializers.CharField(required=True)
    
    def validate(self, data):
        # Check that passwords match
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'Passwords do not match'})
        
        # Validate password strength
        try:
            validate_password(data['password'])
        except ValidationError as e:
            raise serializers.ValidationError({'password': list(e.messages)})
            
        return data 