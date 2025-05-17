from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AnalyticsViewSet, 
    export_completeness_report,
    export_readiness_report,
    export_enrichment_velocity_report,
    export_localization_quality_report,
    export_change_history_report,
    LocalizationQualityView,
)
from django.http import HttpResponse

# Simple test view to confirm URLs are working
def test_export_view(request):
    return HttpResponse("Export test view is working!", content_type="text/plain")

router = DefaultRouter()
router.register(r'analytics', AnalyticsViewSet, basename='analytics')

# These URLs need to match EXACTLY what the frontend expects
urlpatterns = [
    # Include router URLs first
    path('', include(router.urls)),
    
    # Export endpoints - IMPORTANT: These must be OUTSIDE the 'analytics/' prefix
    # because they're included under 'api/' in the main urls.py
    path('completeness-export/', export_completeness_report, name='completeness-export'),
    path('readiness-export/', export_readiness_report, name='readiness-export'),
    path('enrichment-velocity-export/', export_enrichment_velocity_report, name='enrichment-velocity-export'),
    path('localization-quality-export/', export_localization_quality_report, name='localization-quality-export'),
    path('change-history-export/', export_change_history_report, name='change-history-export'),
    
    # Test endpoint
    path('test-export/', test_export_view, name='test-export'),
    
    # New localization quality endpoint
    path('localization-quality/', LocalizationQualityView.as_view(), name='localization_quality'),
] 