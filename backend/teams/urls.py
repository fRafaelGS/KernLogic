from django.urls import path, include, re_path
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'roles', views.RoleViewSet, basename='role')
router.register(r'memberships', views.MembershipViewSet)
router.register(r'audit', views.AuditLogViewSet)

# Standard URL patterns with integer organization IDs
urlpatterns = [
    path('orgs/<int:org_id>/', include(router.urls)),
    path('orgs/<int:org_id>/memberships/<int:pk>/accept/', 
         views.MembershipViewSet.as_view({'post': 'accept'}), 
         name='accept-invite'),
    path('orgs/<int:org_id>/memberships/<int:pk>/resend_invite/', 
         views.MembershipViewSet.as_view({'post': 'resend_invite'}), 
         name='resend-invite'),
    path('orgs/<int:org_id>/memberships/invites/', 
         views.MembershipViewSet.as_view({'get': 'invites'}), 
         name='pending-invites'),
    path('orgs/memberships/<int:pk>/check/', 
         views.MembershipViewSet.as_view({'get': 'check_invitation'}), 
         name='check-invite'),
] 