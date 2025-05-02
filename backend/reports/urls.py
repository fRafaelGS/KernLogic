from rest_framework.routers import DefaultRouter
from .views import ReportThemeViewSet

router = DefaultRouter()
router.register(r'reports/themes', ReportThemeViewSet, basename='report-theme')

urlpatterns = router.urls 