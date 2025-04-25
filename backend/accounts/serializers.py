from rest_framework import serializers
from django.contrib.auth import get_user_model, authenticate
from django.contrib.auth.password_validation import validate_password
from django.core import exceptions

User = get_user_model()

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    password_confirm = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})

    class Meta:
        model = User
        fields = ('id', 'email', 'name', 'password', 'password_confirm')
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
        
        # Create user with validated data
        user = User.objects.create_user(
            email=validated_data['email'],
            name=validated_data['name'],
            password=validated_data['password']
        )
        
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
    class Meta:
        model = User
        fields = ('id', 'email', 'name', 'is_active', 'is_staff', 'is_superuser',)
        read_only_fields = ('id', 'is_active', 'is_staff', 'is_superuser',) 