from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'roles', views.RoleViewSet)
router.register(r'memberships', views.MembershipViewSet)
router.register(r'audit', views.AuditLogViewSet)

urlpatterns = [
    path('api/orgs/<uuid:org_id>/', include(router.urls)),
    path('api/orgs/<uuid:org_id>/memberships/<int:pk>/accept/', 
         views.MembershipViewSet.as_view({'post': 'accept'}), 
         name='accept-invite'),
    path('api/orgs/<uuid:org_id>/memberships/<int:pk>/resend_invite/', 
         views.MembershipViewSet.as_view({'post': 'resend_invite'}), 
         name='resend-invite'),
    path('api/orgs/<uuid:org_id>/memberships/invites/', 
         views.MembershipViewSet.as_view({'get': 'invites'}), 
         name='pending-invites'),
] 