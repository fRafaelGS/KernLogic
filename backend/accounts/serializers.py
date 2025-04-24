from rest_framework import serializers
from django.contrib.auth import get_user_model, authenticate
from django.contrib.auth.password_validation import validate_password

User = get_user_model()

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ('email', 'name', 'password', 'password2')

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs

    def create(self, validated_data):
        user = User.objects.create(
            email=validated_data['email'],
            name=validated_data['name'],
            username=validated_data['email']  # Using email as username
        )
        user.set_password(validated_data['password'])
        user.save()
        return user

class UserLoginSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, write_only=True)

    def validate(self, attrs):
        print("\n" + "="*80)
        print("DEBUG: UserLoginSerializer.validate() called")
        print("="*80)
        
        email = attrs.get('email', '')
        password = attrs.get('password', '')

        print(f"DEBUG: Email: '{email}', Password length: {len(password)}")
        
        if not email or not password:
            print("DEBUG: Email or password is missing")
            raise serializers.ValidationError(
                {'error': 'Email and password are required.'},
                code='authorization'
            )

        try:
            print(f"DEBUG: Authenticating with email: '{email}'")
            
            # Directly try to authenticate
            request = self.context.get('request')
            user = authenticate(
                request=request,
                username=email,
                password=password
            )
            
            if not user:
                print("DEBUG: Authentication failed - no user returned")
                raise serializers.ValidationError(
                    {'error': 'Invalid email or password.'},
                    code='authorization'
                )
                
            if not user.is_active:
                print(f"DEBUG: User account is inactive: {email}")
                raise serializers.ValidationError(
                    {'error': 'User account is disabled.'},
                    code='authorization'
                )
            
            print(f"DEBUG: Authentication successful for user: {user.email}")
            attrs['user'] = user
            return attrs
                
        except Exception as e:
            import traceback
            print("\nDEBUG: Exception during login validation")
            print(f"DEBUG: {str(e)}")
            print(f"DEBUG: {traceback.format_exc()}")
            
            # Handle database connection errors
            raise serializers.ValidationError(
                {'error': f'Authentication error: {str(e)}'},
                code='authorization'
            )

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'email', 'name', 'is_active', 'created_at', 'updated_at')
        # Ensure name and email are not read_only for updates
        read_only_fields = ('id', 'is_active', 'created_at', 'updated_at') 