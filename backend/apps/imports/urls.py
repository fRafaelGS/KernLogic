from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ImportTaskViewSet

router = DefaultRouter()
router.register(r"imports", ImportTaskViewSet, basename="imports")

urlpatterns = [
    path("", include(router.urls)),
] 