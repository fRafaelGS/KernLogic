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
from django.contrib.auth import login
from .models import User, Profile
from kernlogic.utils import get_user_org_id, get_user_organization
from teams.models import Membership

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

@method_decorator(csrf_exempt, name='dispatch')
class RegisterView(APIView):
    """API View for user registration"""
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        print("DEBUG: RegisterView POST request received")
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
                
            # Get organization ID from request data if provided
            organization_id = request.data.get('organization_id')
            if organization_id:
                print(f"DEBUG: Organization registration for org ID: {organization_id}")
            
            # Save user with the serializer (which handles org membership)
            serializer = UserRegistrationSerializer(data=request.data)
            if serializer.is_valid():
                user = serializer.save()
                
                # Get user's organization ID using the new utility
                org_id = get_user_org_id(user)
                
                # Generate tokens
                tokens = get_tokens_for_user(user)
                
                # Get user role if available
                role = None
                try:
                    membership = Membership.objects.filter(user=user, status='active').first()
                    if membership:
                        role = membership.role.name.lower()
                except Exception as e:
                    print(f"DEBUG: Error getting user role: {str(e)}")
                
                # Build response with user data and tokens
                response_data = {
                    'user': {
                        'id': user.id,
                        'email': user.email,
                        'name': user.name,
                        'is_staff': user.is_staff,
                        'is_superuser': user.is_superuser,
                        'role': role,
                        'organization_id': org_id
                    },
                    'access': tokens['access'],
                    'refresh': tokens['refresh']
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
                    
                    # Find their active membership, if any
                    membership = Membership.objects.filter(user=user, status='active').first()
                    org_id = membership.organization.id if membership else None
                    role = membership.role.name.lower() if membership and membership.role else None
                    
                    response_data = {
                        'user': {
                            'id': user.id,
                            'email': user.email,
                            'name': user.name,
                            'is_staff': user.is_staff,
                            'is_superuser': user.is_superuser,
                            'organization_id': org_id,    # Include organization_id
                            'role': role,                 # Include role
                        },
                        'access': tokens['access'],
                        'refresh': tokens['refresh']
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
        # Use the serializer to return the user data with organization_id and role
        user = request.user
        serializer = UserSerializer(user, context={'request': request})
        return Response(serializer.data)

class SetPasswordView(APIView):
    """API View for setting password for existing users (typically from invitation)"""
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        print("DEBUG: SetPasswordView POST request received")
        try:
            # Get data from request
            email = request.data.get('email')
            password = request.data.get('password')
            password_confirm = request.data.get('password_confirm')
            organization_id = request.data.get('organization_id')
            invitation_token = request.data.get('invitation_token')
            name = request.data.get('name')  # Get user's name if provided
            
            # Validate inputs
            if not email or not password or not password_confirm:
                return Response(
                    {'error': 'Email, password and password confirmation are required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            if password != password_confirm:
                return Response(
                    {'error': 'Passwords do not match'},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            # Find the user
            try:
                user = User.objects.get(email=email)
            except User.DoesNotExist:
                return Response(
                    {'error': 'User not found with this email'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Update name if provided
            if name:
                user.name = name
                
            # Set the password
            user.set_password(password)
            user.save()
            
            # Initialize organization_info and role for the response
            org_id = None
            role = None
            
            # If organization_id and invitation_token are provided, update membership
            if organization_id and invitation_token:
                try:
                    from organizations.models import Organization
                    from teams.models import Membership
                    
                    organization = Organization.objects.get(id=organization_id)
                    
                    # Look for pending membership
                    membership = Membership.objects.filter(
                        user=user,
                        organization=organization,
                        status='pending'
                    ).first()
                    
                    if membership:
                        # Activate the membership
                        membership.status = 'active'
                        membership.save()
                        print(f"DEBUG: Activated membership for {user.email} in org {organization.name}")
                        
                        # Set organization ID and role for response
                        org_id = organization.id
                        role = membership.role.name.lower() if membership.role else 'viewer'
                    else:
                        print(f"DEBUG: No pending membership found for {user.email}")
                except Exception as e:
                    print(f"DEBUG: Error updating membership: {str(e)}")
                    # Continue despite membership update failure
            
            # Generate authentication tokens
            tokens = get_tokens_for_user(user)
            
            # Return successful response with tokens and user data including organization_id and role
            return Response({
                'detail': 'Password set successfully',
                'access': tokens['access'],
                'refresh': tokens['refresh'],
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'name': user.name,
                    'is_staff': user.is_staff,
                    'is_superuser': user.is_superuser,
                    'organization_id': org_id,
                    'role': role
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            print(f"DEBUG: Exception in SetPasswordView: {str(e)}")
            print(traceback.format_exc())
            return Response(
                {'error': f'Password update failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class CheckUserView(APIView):
    """API View to check if a user exists and needs to set a password"""
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        print("DEBUG: CheckUserView POST request received")
        try:
            email = request.data.get('email')
            organization_id = request.data.get('organization_id')
            
            if not email:
                return Response(
                    {'error': 'Email is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            # Check if user exists
            try:
                user = User.objects.get(email=email)
                
                # Check if user has usable password
                has_password = user.has_usable_password()
                
                # Check if user has pending membership in the organization
                has_pending_membership = False
                
                if organization_id:
                    try:
                        from organizations.models import Organization
                        from teams.models import Membership
                        
                        organization = Organization.objects.get(id=organization_id)
                        
                        membership = Membership.objects.filter(
                            user=user,
                            organization=organization,
                            status='pending'
                        ).exists()
                        
                        has_pending_membership = membership
                    except Exception as e:
                        print(f"DEBUG: Error checking membership: {str(e)}")
                
                return Response({
                    'exists': True,
                    'needs_password': not has_password,
                    'has_pending_membership': has_pending_membership
                }, status=status.HTTP_200_OK)
                
            except User.DoesNotExist:
                return Response({
                    'exists': False,
                    'needs_password': False,
                    'has_pending_membership': False
                }, status=status.HTTP_200_OK)
                
        except Exception as e:
            print(f"DEBUG: Exception in CheckUserView: {str(e)}")
            print(traceback.format_exc())
            return Response(
                {'error': f'User check failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
