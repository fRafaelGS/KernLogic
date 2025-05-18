from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ImportTaskViewSet, 
    FieldSchemaView, 
    AttributeGroupImportViewSet,
    AttributeImportViewSet, 
    FamilyImportViewSet,
    AttributeGroupSchemaView,
    AttributeSchemaView,
    FamilySchemaView
)

router = DefaultRouter()
router.register(r"imports", ImportTaskViewSet, basename="imports")
router.register(r"attribute-groups-import", AttributeGroupImportViewSet, basename="attribute-groups-import")
router.register(r"attributes-import", AttributeImportViewSet, basename="attributes-import")
router.register(r"families-import", FamilyImportViewSet, basename="families-import")

urlpatterns = [
    path("", include(router.urls)),
    # Field schema endpoints
    path("field-schema/", FieldSchemaView.as_view(), name="imports-field-schema"),
    path("attribute-groups-schema/", AttributeGroupSchemaView.as_view(), name="attribute-groups-schema"),
    path("attributes-schema/", AttributeSchemaView.as_view(), name="attributes-schema"),
    path("families-schema/", FamilySchemaView.as_view(), name="families-schema"),
] 