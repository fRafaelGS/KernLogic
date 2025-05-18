from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ImportTaskViewSet, FieldSchemaView

router = DefaultRouter()
router.register(r"imports", ImportTaskViewSet, basename="imports")

urlpatterns = [
    path("", include(router.urls)),
    # Add field-schema endpoint under imports path as well
    path("imports/field-schema/", FieldSchemaView.as_view(), name="imports-field-schema"),
] 