from django.urls import path
from .views import (
    RegisterView,
    LoginView,
    LogoutView,
    UserDetailView,
    AdminUserListView,
    DatabaseTestView,
    CurrentUserView,
    SetPasswordView,
    CheckUserView
)
from rest_framework_simplejwt.views import TokenRefreshView
from django.views.decorators.csrf import csrf_exempt

urlpatterns = [
    # Auth endpoints
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('set-password/', SetPasswordView.as_view(), name='set-password'),
    path('check-user/', CheckUserView.as_view(), name='check-user'),
    path('user/', UserDetailView.as_view(), name='user_detail'),
    path('users/', AdminUserListView.as_view(), name='admin_user_list'),
    path('users/me/', CurrentUserView.as_view(), name='current-user'),
    
    # Token endpoints
    path('token/refresh/', csrf_exempt(TokenRefreshView.as_view()), name='token_refresh'),
    
    # Test/Debug endpoints
    path('test-db/', DatabaseTestView.as_view(), name='test-db'),
] 