from django.urls import path
from .views import OrganizationDetailView

urlpatterns = [
    # Organization detail endpoint that supports both GET and PATCH
    path('<int:org_id>/', OrganizationDetailView.as_view(), name='organization_detail'),
] 