from rest_framework import serializers
from django.contrib.auth import get_user_model, authenticate
from django.contrib.auth.password_validation import validate_password
from django.core import exceptions

User = get_user_model()

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    password_confirm = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    organization_id = serializers.CharField(write_only=True, required=False)
    invitation_token = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = ('id', 'email', 'name', 'password', 'password_confirm', 'organization_id', 'invitation_token')
        extra_kwargs = {
            'email': {'required': True},
            'name': {'required': True}
        }

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        
        # Validate password strength
        try:
            validate_password(attrs['password'])
        except exceptions.ValidationError as e:
            raise serializers.ValidationError({"password": list(e.messages)})
            
        return attrs

    def create(self, validated_data):
        # Remove password_confirm from validated data
        validated_data.pop('password_confirm')
        
        # Extract organization info before creating user
        organization_id = validated_data.pop('organization_id', None)
        invitation_token = validated_data.pop('invitation_token', None)
        
        # Create user with validated data
        user = User.objects.create_user(
            email=validated_data['email'],
            name=validated_data['name'],
            password=validated_data['password']
        )
        
        # If this is an organization invitation registration, create/update membership
        if organization_id:
            try:
                from organizations.models import Organization
                from teams.models import Membership, Role
                
                # Get the organization
                try:
                    organization = Organization.objects.get(id=organization_id)
                    
                    # Check if there's a pending membership for this email
                    membership = Membership.objects.filter(
                        user__email=user.email,
                        organization=organization,
                        status='pending'
                    ).first()
                    
                    if membership:
                        # Update the existing membership to active status
                        membership.user = user  # Ensure it's linked to the newly created user
                        membership.status = 'active'
                        membership.save()
                    else:
                        # If no pending membership exists, create a new one with default viewer role
                        default_role = Role.objects.filter(name='Viewer').first()
                        if not default_role:
                            # Fall back to the first available role
                            default_role = Role.objects.first()
                        
                        if default_role:
                            Membership.objects.create(
                                user=user,
                                organization=organization,
                                role=default_role,
                                status='active'
                            )
                except Organization.DoesNotExist:
                    # Log this but don't fail registration
                    print(f"WARNING: Could not find organization with ID {organization_id} for user registration")
            except Exception as e:
                # Log the error but don't prevent user creation
                print(f"ERROR: Failed to process organization membership during registration: {str(e)}")
        
        return user


class UserLoginSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, write_only=True, style={'input_type': 'password'})
    
    def validate(self, data):
        print(f"DEBUG: UserLoginSerializer.validate() called with email: {data.get('email')}")
        
        email = data.get('email', '')
        password = data.get('password', '')
        
        if not email:
            raise serializers.ValidationError({'email': 'Email is required'})
        
        if not password:
            raise serializers.ValidationError({'password': 'Password is required'})
            
        # Normalize the email address
        email = email.lower().strip()
        data['email'] = email
        
        # We don't authenticate here - we just validate the form data
        # Authentication happens in the view
        
        print("DEBUG: UserLoginSerializer validation passed")
        return data


class UserSerializer(serializers.ModelSerializer):
    organization_id = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()
    avatar_url = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ('id', 'email', 'name', 'is_active', 'is_staff', 'is_superuser', 'organization_id', 'role', 'avatar_url')
        read_only_fields = ('id', 'is_active', 'is_staff', 'is_superuser', 'organization_id', 'role', 'avatar_url')
        
    def get_organization_id(self, user):
        try:
            from teams.models import Membership
            membership = Membership.objects.filter(user=user, status='active').select_related('organization').first()
            return membership.organization.id if membership else None
        except Exception as e:
            print(f"Error getting organization_id for user {user.id}: {str(e)}")
            return None
            
    def get_role(self, user):
        # Always return 'admin' for staff or superuser
        if user.is_superuser or user.is_staff:
            return 'admin'
        try:
            from teams.models import Membership
            membership = Membership.objects.filter(user=user, status='active').select_related('role').first()
            return membership.role.name.lower() if membership and membership.role else None
        except Exception as e:
            print(f"Error getting role for user {user.id}: {str(e)}")
            return None
            
    def get_avatar_url(self, user):
        try:
            # Check if user has a profile with an avatar
            if hasattr(user, 'profile') and user.profile.avatar:
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(user.profile.avatar.url)
                return user.profile.avatar.url
            return None
        except Exception as e:
            print(f"Error getting avatar_url for user {user.id}: {str(e)}")
            return None 