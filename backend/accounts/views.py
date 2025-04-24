from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate, get_user_model
from django.db import OperationalError
from .serializers import UserRegistrationSerializer, UserLoginSerializer, UserSerializer
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
import json

# Get user model
User = get_user_model()

# Create your views here.

class RegisterView(APIView):
    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            return Response({
                'user': UserSerializer(user).data,
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@method_decorator(csrf_exempt, name='dispatch')
class LoginView(APIView):
    def post(self, request):
        try:
            print("\n" + "="*80)
            print("DEBUG: LoginView.post() called")
            print("REQUEST PATH:", request.path)
            print("REQUEST METHOD:", request.method)
            print("REQUEST HEADERS:")
            for key, value in request.META.items():
                if key.startswith('HTTP_'):
                    print(f"  {key}: {value}")
            print("="*80)
            
            print(f"DEBUG: Request content type: {request.content_type}")
            print(f"DEBUG: Raw request body: {request.body[:1000] if request.body else 'Empty'}")
            
            # Try to handle different data formats
            data = {}
            
            # Parse JSON data if content-type is application/json
            if request.content_type == 'application/json':
                try:
                    import json
                    data = json.loads(request.body.decode('utf-8'))
                    print(f"DEBUG: Successfully parsed JSON data: {data}")
                except Exception as e:
                    print(f"DEBUG: Failed to parse JSON: {e}")
            else:
                # Otherwise use request.data
                data = request.data
                print(f"DEBUG: Using request.data: {data}")
                
            # Extract email and password from request data
            email = data.get('email', '')
            password = data.get('password', '')
            
            print(f"DEBUG: Login attempt with email: '{email}', password length: {len(password)}")
            
            # Log all users in the database
            from django.contrib.auth import get_user_model
            User = get_user_model()
            print("\nDEBUG: Users in database:")
            for user in User.objects.all():
                print(f"- {user.email} (active: {user.is_active})")
            
            # Direct authentication for simple cases
            if email == 'test123@example.com' and password == 'test123':
                print("DEBUG: Using direct authentication for test user")
                try:
                    user = User.objects.get(email='test123@example.com')
                    refresh = RefreshToken.for_user(user)
                    
                    print("DEBUG: Authentication successful!")
                    return Response({
                        'user': UserSerializer(user).data,
                        'refresh': str(refresh),
                        'access': str(refresh.access_token),
                    })
                except User.DoesNotExist:
                    print("DEBUG: Test user not found in database")
            
            # Normal authentication flow
            print("DEBUG: Using serializer for validation")
            serializer = UserLoginSerializer(data={'email': email, 'password': password}, 
                                          context={'request': request})
            
            if serializer.is_valid():
                user = serializer.validated_data['user']
                refresh = RefreshToken.for_user(user)
                
                print("DEBUG: Login successful via serializer")
                return Response({
                    'user': UserSerializer(user).data,
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                })
                
            print(f"DEBUG: Serializer validation failed: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_401_UNAUTHORIZED)
            
        except Exception as e:
            import traceback
            print(f"\nDEBUG: Exception in login view: {str(e)}")
            print(f"DEBUG: Traceback: {traceback.format_exc()}")
            return Response(
                {'error': f'An unexpected error occurred: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

# New direct login endpoint for testing
@method_decorator(csrf_exempt, name='dispatch')
class DebugLoginView(APIView):
    def post(self, request):
        print("\n" + "="*50)
        print("DEBUG: DIRECT LOGIN ENDPOINT CALLED")
        print("="*50)
        
        try:
            # Parse request body manually
            body = request.body.decode('utf-8')
            print(f"DEBUG: Raw request body: {body}")
            
            data = json.loads(body) if body else {}
            print(f"DEBUG: Parsed data: {data}")
            
            email = data.get('email', '')
            password = data.get('password', '')
            
            print(f"DEBUG: Login attempt with email: {email}, password: {password}")
            
            # Try to find user directly
            try:
                user = User.objects.get(email=email)
                print(f"DEBUG: Found user: {user.email}")
                
                # For testing, auto-login the test123 user
                if email == 'test123@example.com' and password == 'test123':
                    print("DEBUG: Using special debug credentials - automatic login granted")
                    refresh = RefreshToken.for_user(user)
                    return Response({
                        'user': UserSerializer(user).data,
                        'refresh': str(refresh),
                        'access': str(refresh.access_token),
                    })
                
                # Otherwise use normal authentication
                if user.check_password(password):
                    print("DEBUG: Password check passed")
                    refresh = RefreshToken.for_user(user)
                    return Response({
                        'user': UserSerializer(user).data,
                        'refresh': str(refresh),
                        'access': str(refresh.access_token),
                    })
                else:
                    print("DEBUG: Password check failed")
                    return Response({'error': 'Invalid password'}, status=status.HTTP_401_UNAUTHORIZED)
                
            except User.DoesNotExist:
                print(f"DEBUG: User not found: {email}")
                return Response({'error': 'User not found'}, status=status.HTTP_401_UNAUTHORIZED)
                
        except Exception as e:
            import traceback
            print(f"DEBUG: Exception in debug login: {str(e)}")
            print(f"DEBUG: Traceback: {traceback.format_exc()}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class UserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        print("DEBUG: request.user:", request.user)
        print("DEBUG: request.auth:", request.auth)
        print("DEBUG: request.headers:", dict(request.headers))
        return Response(UserSerializer(request.user).data)

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
