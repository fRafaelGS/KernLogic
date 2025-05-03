"""
URL configuration for core project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import path, include, re_path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import TemplateView
from django.views.decorators.csrf import csrf_exempt
from django.http import HttpResponse
import pandas as pd

from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

# Import the export views directly
from analytics.views import (
    export_completeness_report,
    export_readiness_report,
    export_enrichment_velocity_report,
    export_localization_quality_report,
    export_change_history_report,
)

# Debug view for testing exports directly
def test_csv_export(request):
    """Simple view to test CSV exports directly"""
    print(f"Test CSV export called at path: {request.path}")
    print(f"Query params: {request.GET}")
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="test_export.csv"'
    response.write('id,name,value\n1,Test Item,100\n2,Another Item,200\n')
    return response

# Create direct export functions for simplified debugging
def direct_completeness_export(request):
    """Direct completeness export - bypasses DRF routing"""
    from analytics.models import FactProductAttribute, DimLocale, DimAttribute, DimProduct, DimChannel
    
    try:
        print(f"DIRECT export function called at: {request.path}")
        print(f"Query params: {request.GET}")
        
        # Get a simple dataset for testing
        queryset = FactProductAttribute.objects.all()[:100]  # Limit to 100 rows
        
        # Create a simple DataFrame
        data = [
            {
                'product': fact.product.sku if fact.product else 'Unknown',
                'attribute': fact.attribute.label if fact.attribute else 'Unknown',
                'completed': 'Yes' if fact.completed else 'No'
            }
            for fact in queryset
        ]
        
        # If no data, use sample data
        if not data:
            data = [
                {'product': 'Sample-001', 'attribute': 'Name', 'completed': 'Yes'},
                {'product': 'Sample-002', 'attribute': 'Description', 'completed': 'No'}
            ]
        
        # Create DataFrame
        df = pd.DataFrame(data)
        
        # Get format
        export_format = request.GET.get('format', 'csv')
        
        # Return appropriate response
        if export_format == 'xlsx':
            response = HttpResponse(
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            response['Content-Disposition'] = 'attachment; filename="completeness_report.xlsx"'
            df.to_excel(response, index=False, sheet_name='CompletenessReport')
        else:
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = 'attachment; filename="completeness_report.csv"'
            df.to_csv(response, index=False)
        
        print(f"DIRECT export returning {len(data)} rows as {export_format}")
        return response
        
    except Exception as e:
        print(f"DIRECT export error: {str(e)}")
        return HttpResponse(f"Error in direct export: {str(e)}", status=500)

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Authentication API
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Direct test endpoint for debugging
    path('api/test-export/', test_csv_export, name='test-export'),
    
    # Direct export at simplest URL path for testing
    path('export-csv/', test_csv_export, name='direct-export'),
    
    # DIRECT EXPORT ENDPOINTS WITH SIMPLIFIED PATHS
    # These are direct function views outside of DRF's router system
    path('export/completeness/', direct_completeness_export, name='direct-completeness-export'),
    
    # Export endpoints mapped directly at the root level for simplicity
    path('api/analytics/completeness-export/', export_completeness_report, name='analytics-completeness-export'),
    path('api/analytics/readiness-export/', export_readiness_report, name='analytics-readiness-export'),
    path('api/analytics/enrichment-velocity-export/', export_enrichment_velocity_report, name='analytics-enrichment-velocity-export'),
    path('api/analytics/localization-quality-export/', export_localization_quality_report, name='analytics-localization-quality-export'),
    path('api/analytics/change-history-export/', export_change_history_report, name='analytics-change-history-export'),
    
    # Product API
    path('api/', include('products.urls')),
    
    # Imports API
    path('api/', include('apps.imports.urls')),
    
    # Reports API
    path('api/', include('reports.urls')),
    
    # Analytics API - make sure module path is correct
    path('api/', include('analytics.urls')),
    
    # Teams API
    path('', include('teams.urls')),
    
    # Accounts API - add this line to include accounts URLs
    path('api/', include('accounts.urls')),
    
    # API Schema documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]

# For development, serve media and static files
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

# React SPA - serve in production (This must be last)
urlpatterns.append(re_path('.*', TemplateView.as_view(template_name='index.html')))
