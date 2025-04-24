from django.urls import path
from .views import RegisterView, LoginView, UserView, DatabaseTestView, DebugLoginView
from django.http import JsonResponse
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from django.views.decorators.csrf import csrf_exempt
from .serializers import UserSerializer
from django.contrib.auth import get_user_model

User = get_user_model()

@csrf_exempt
def test_login(request):
    """Special endpoint that always logs in the test user for debugging"""
    print("\n" + "="*80)
    print("DEBUG: TEST LOGIN ENDPOINT CALLED")
    print("="*80)
    
    try:
        # Get or create test user
        user, created = User.objects.get_or_create(
            email='test123@example.com',
            defaults={
                'username': 'test123',
                'name': 'Test User',
                'is_active': True
            }
        )
        
        if created:
            user.set_password('test123')
            user.save()
            print("DEBUG: Created new test user")
        
        # Generate tokens
        refresh = RefreshToken.for_user(user)
        
        # Return success response
        print("DEBUG: Test login successful")
        return JsonResponse({
            'user': UserSerializer(user).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        })
    except Exception as e:
        import traceback
        print(f"DEBUG: Test login error: {str(e)}")
        print(traceback.format_exc())
        return JsonResponse({'error': str(e)}, status=500)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('user/', UserView.as_view(), name='user'),
    path('test-db/', DatabaseTestView.as_view(), name='test-db'),
    path('debug-login/', DebugLoginView.as_view(), name='debug-login'),
    path('test-login/', test_login, name='test-login'),
    path('refresh/', csrf_exempt(TokenRefreshView.as_view()), name='token_refresh'),
    path('auth/login/', LoginView.as_view(), name='auth_login_duplicate'),
] 