from django.shortcuts import get_object_or_404
from rest_framework import status, permissions, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.generics import RetrieveUpdateAPIView, RetrieveAPIView, ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate, get_user_model
from django.db import OperationalError
from .serializers import UserRegistrationSerializer, UserLoginSerializer, UserSerializer
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
import json
import traceback

# Get user model
User = get_user_model()

# Create your views here.

def get_tokens_for_user(user):
    """Generate JWT tokens for the authenticated user"""
    try:
        print(f"DEBUG: Generating tokens for user {user.email}")
        refresh = RefreshToken.for_user(user)
        tokens = {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }
        print(f"DEBUG: Successfully generated tokens")
        return tokens
    except Exception as e:
        print(f"DEBUG: Error in get_tokens_for_user: {str(e)}")
        print(traceback.format_exc())
        raise

class RegisterView(APIView):
    """API View for user registration"""
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        print("DEBUG: RegisterView POST request received")
        try:
            serializer = UserRegistrationSerializer(data=request.data)
            
            if serializer.is_valid():
                print("DEBUG: Registration data is valid")
                user = serializer.save()
                
                # Generate tokens
                tokens = get_tokens_for_user(user)
                
                response_data = {
                    'user': {
                        'id': user.id,
                        'email': user.email,
                        'name': user.name
                    },
                    'tokens': tokens
                }
                
                print(f"DEBUG: User registered successfully: {user.email}")
                return Response(response_data, status=status.HTTP_201_CREATED)
            
            print(f"DEBUG: Registration validation errors: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            print(f"DEBUG: Exception in RegisterView: {str(e)}")
            print(traceback.format_exc())
            return Response(
                {'error': f'Registration failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

@method_decorator(csrf_exempt, name='dispatch')
class LoginView(APIView):
    """API View for user login"""
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        print("DEBUG: LoginView POST request received")
        print(f"DEBUG: Request headers: {dict(request.headers)}")
        print(f"DEBUG: Request body: {request.body.decode('utf-8')}")
        
        try:
            # Check if the content type is correct
            content_type = request.headers.get('Content-Type', '').lower()
            if 'application/json' not in content_type:
                print(f"DEBUG: Invalid content type: {content_type}")
                return Response(
                    {'error': f'Expected application/json, got {content_type}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Use serializer for validation only
            serializer = UserLoginSerializer(data=request.data)
            
            if not serializer.is_valid():
                print(f"DEBUG: Login validation errors: {serializer.errors}")
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
            validated_data = serializer.validated_data
            email = validated_data.get('email')
            password = validated_data.get('password')
            
            print(f"DEBUG: Attempting to authenticate user: {email}")
            
            # First check if user exists
            try:
                user_obj = User.objects.get(email=email)
                print(f"DEBUG: Found user with email: {email}")
            except User.DoesNotExist:
                print(f"DEBUG: No user found with email: {email}")
                return Response(
                    {'error': 'Invalid email or password'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
                
            # Attempt to authenticate
            user = authenticate(request=request, username=email, password=password)
            
            if user is not None:
                print(f"DEBUG: Authentication successful for user: {user.email}")
                
                try:
                    # Generate tokens
                    tokens = get_tokens_for_user(user)
                    
                    response_data = {
                        'user': {
                            'id': user.id,
                            'email': user.email,
                            'name': user.name,
                            'is_staff': user.is_staff,
                            'is_superuser': user.is_superuser
                        },
                        'tokens': tokens
                    }
                    
                    return Response(response_data, status=status.HTTP_200_OK)
                except Exception as token_error:
                    print(f"DEBUG: Error generating tokens: {str(token_error)}")
                    print(traceback.format_exc())
                    return Response(
                        {'error': 'Error generating authentication tokens'},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
            else:
                print(f"DEBUG: Authentication failed for user: {email}")
                return Response(
                    {'error': 'Invalid email or password'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
                
        except Exception as e:
            print(f"DEBUG: Exception in LoginView: {str(e)}")
            print(traceback.format_exc())
            return Response(
                {'error': f'Login failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class LogoutView(APIView):
    """API View for user logout - blacklists the refresh token"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(status=status.HTTP_205_RESET_CONTENT)
        except Exception as e:
            return Response(status=status.HTTP_400_BAD_REQUEST)

class UserDetailView(RetrieveAPIView):
    """API View to retrieve authenticated user information"""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserSerializer
    
    def get_object(self):
        return self.request.user

class AdminUserListView(ListAPIView):
    """API View to list all users (admin only)"""
    permission_classes = [permissions.IsAdminUser]
    serializer_class = UserSerializer
    queryset = User.objects.all()

class UserView(RetrieveUpdateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user

class DatabaseTestView(APIView):
    def get(self, request):
        try:
            from django.db import connection
            with connection.cursor() as cursor:
                cursor.execute('SELECT 1')
            return Response({'status': 'Database connection successful'})
        except OperationalError:
            return Response(
                {'error': 'Could not connect to the database'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # Return information about the current user
        user = request.user
        org_id = None
        
        # Try to get organization ID from profile if it exists
        if hasattr(user, 'profile') and user.profile and hasattr(user.profile, 'organization'):
            org_id = str(user.profile.organization.id) if user.profile.organization else None
        
        # Build user data response
        user_data = {
            'id': user.id,
            'email': user.email,
            'name': user.get_full_name() or user.username,
            'username': user.username,
            'is_staff': user.is_staff,
            'is_superuser': user.is_superuser,
            'date_joined': user.date_joined,
            'profile': {
                'organization': {
                    'id': org_id,
                } if org_id else None
            }
        }
        
        return Response(user_data)
