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
from django.views.generic import TemplateView
from django.conf import settings
from django.conf.urls.static import static
from accounts.views import LoginView
from django.views.decorators.csrf import csrf_exempt
import django.views.static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/', include('products.urls')),
    # Special path to handle duplicate auth in URL
    path('api/auth/auth/login/', csrf_exempt(LoginView.as_view()), name='login_duplicate_auth'),
    # Serve the React SPA for all other routes
    re_path(r'^.*', TemplateView.as_view(template_name='index.html')),
]

# Add media files serving in development
if settings.DEBUG:
    urlpatterns = [
        # Serve media files first to ensure they're accessible
        path('media/<path:path>', 
             django.views.static.serve, 
             {'document_root': settings.MEDIA_ROOT}),
    ] + urlpatterns + static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
