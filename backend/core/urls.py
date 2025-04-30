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

import os
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
import django.views.static

from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

# Import routers from apps
from products.urls import router as products_router
from products.urls import assets_router as products_assets_router
from apps.imports.urls import router as imports_router
from products.views import SkuCheckAPIView

# Create a versioned router for v1
# All existing routes mapped to v1
urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Authentication API (no need to version auth endpoints)
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # API Schema documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    
    # Versioned API endpoints
    path('api/v1/', include([
        path('', include(products_router.urls)),
        path('', include(products_assets_router.urls)),
        path('', include(imports_router.urls)),
        path('products/sku-check/', SkuCheckAPIView.as_view(), name='products-sku-check-v1'),
    ])),
]

# Temporary alias for legacy routes, controlled by an environment variable
if os.getenv("ENABLE_LEGACY_ENDPOINTS", "1") == "1":
    urlpatterns += [
        path('api/', include(products_router.urls)),
        path('api/', include(products_assets_router.urls)),
        path('api/', include(imports_router.urls)),
        path('api/products/sku-check/', SkuCheckAPIView.as_view(), name='products-sku-check'),
    ]

# For development, serve media and static files
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

# React SPA - serve in production (This must be last)
urlpatterns.append(re_path('.*', TemplateView.as_view(template_name='index.html')))
