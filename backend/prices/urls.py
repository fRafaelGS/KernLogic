from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CurrencyViewSet, PriceTypeViewSet, ProductPriceViewSet

router = DefaultRouter()
router.register(r'currencies', CurrencyViewSet, basename='currency')
router.register(r'price-types', PriceTypeViewSet, basename='price-type')

urlpatterns = [
    path('', include(router.urls)),
] 