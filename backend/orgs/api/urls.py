from django.urls import path
from .views import (
    membership_avatar,
)

urlpatterns = [
    # Avatar endpoint
    path('orgs/<int:org_id>/memberships/<int:membership_id>/avatar/', membership_avatar, name='membership-avatar'),
]