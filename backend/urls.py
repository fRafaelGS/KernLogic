from django.urls import path, include

urlpatterns = [
    # ... other includes ...
    path('api/organizations/', include('organizations.urls')),
    # ... existing code ...
] 