from django.shortcuts import render, get_object_or_404
from rest_framework import viewsets, permissions
from .models import Currency, PriceType, ProductPrice
from .serializers import CurrencySerializer, PriceTypeSerializer, ProductPriceSerializer
from kernlogic.org_queryset import OrganizationQuerySetMixin


class CurrencyViewSet(OrganizationQuerySetMixin, viewsets.ModelViewSet):
    """
    API endpoint for Currency CRUD operations.
    """
    queryset = Currency.objects.all()
    serializer_class = CurrencySerializer
    permission_classes = [permissions.IsAuthenticated]
    basename = 'currency'
    
    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.orgs_memberships.first().org)


class PriceTypeViewSet(OrganizationQuerySetMixin, viewsets.ModelViewSet):
    """
    API endpoint for PriceType CRUD operations.
    """
    queryset = PriceType.objects.all()
    serializer_class = PriceTypeSerializer
    permission_classes = [permissions.IsAuthenticated]
    basename = 'price-type'
    
    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.orgs_memberships.first().org)


class ProductPriceViewSet(viewsets.ModelViewSet):
    """
    API endpoint for ProductPrice CRUD operations, nested under products.
    """
    serializer_class = ProductPriceSerializer
    permission_classes = [permissions.IsAuthenticated]
    basename = 'product-prices'
    
    def get_queryset(self):
        """
        Filter queryset to show only prices for the specified product
        and the user's organization.
        """
        product_pk = self.kwargs.get('product_pk')
        user_org = self.request.user.orgs_memberships.first().org
        
        queryset = ProductPrice.objects.filter(
            product_id=product_pk,
            organization=user_org
        )
        
        # Filter by currency
        currency = self.request.query_params.get('currency')
        if currency:
            queryset = queryset.filter(currency__iso_code=currency)
        
        # Filter by date range
        valid_from_after = self.request.query_params.get('valid_from_after')
        if valid_from_after:
            queryset = queryset.filter(valid_from__gte=valid_from_after)
        
        valid_from_before = self.request.query_params.get('valid_from_before')
        if valid_from_before:
            queryset = queryset.filter(valid_from__lte=valid_from_before)
        
        # Filter by price type
        price_type = self.request.query_params.get('price_type')
        if price_type:
            queryset = queryset.filter(price_type_id=price_type)
        
        # Filter by channel
        channel = self.request.query_params.get('channel')
        if channel:
            queryset = queryset.filter(channel_id=channel)
        
        return queryset
    
    def perform_create(self, serializer):
        """
        Set the product ID and organization when creating a new price.
        """
        product_pk = self.kwargs.get('product_pk')
        user_org = self.request.user.orgs_memberships.first().org
        
        serializer.save(
            product_id=product_pk,
            organization=user_org
        )
    
    def perform_update(self, serializer):
        """
        Ensure organization is preserved when updating.
        """
        user_org = self.request.user.orgs_memberships.first().org
        serializer.save(organization=user_org)
