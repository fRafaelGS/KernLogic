from django.db.models import Count, Q, F, FloatField
from django.db.models.functions import Cast
from products.models import AttributeValue, Attribute, Product
from datetime import datetime
from decimal import Decimal
import os
import sys
import logging
import json
from django.conf import settings

# Set up logger
logger = logging.getLogger(__name__)

# Add the root directory to the Python path to make imports work
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# Import the product analytics service
try:
    from src.services.productAnalyticsService import (
        fetchAllAttributeValues,
        ReportFiltersState
    )
except ImportError as e:
    logger.error(f"Error importing productAnalyticsService: {e}")
    # Fall back to direct model access if service is not available


def get_localization_quality_stats(
    user=None,
    from_date=None,
    to_date=None,
    locale=None,
    category=None,
    channel=None,
    family=None
):
    """
    Calculate localization quality statistics.
    
    Args:
        user: The user requesting the data (for organization scoping)
        from_date: Optional start date for filtering
        to_date: Optional end date for filtering
        locale: Optional locale code to filter by
        category: Optional category ID or slug to filter by
        channel: Optional channel ID or slug to filter by
        family: Optional family ID or slug to filter by
        
    Returns:
        dict: Dictionary with overall stats and locale-specific stats
    """
    # Check if the ProductsAPI environment variables are set
    products_api_base = os.environ.get('PRODUCTS_API_BASE_URL')
    jwt_token = os.environ.get('SERVICE_JWT_TOKEN')
    
    if not products_api_base or not jwt_token:
        logger.warning("PRODUCTS_API_BASE_URL or SERVICE_JWT_TOKEN not set. Falling back to direct DB access.")
        return _get_localization_quality_stats_db(user, from_date, to_date, locale, category, channel, family)
    
    try:
        # Create filters object for the product analytics service
        filters = ReportFiltersState(
            from_date=from_date,
            to_date=to_date,
            locale=locale,
            category=category,
            channel=channel,
            family=family
        )
        
        # Use the product analytics service to fetch attribute values
        attribute_values = fetchAllAttributeValues(filters)
        
        # Process the attribute values to compute localization stats
        return _compute_localization_stats_from_service(attribute_values, locale)
    except Exception as e:
        logger.error(f"Error using product analytics service: {e}")
        # Fall back to direct DB access in case of errors
        return _get_localization_quality_stats_db(user, from_date, to_date, locale, category, channel, family)


def _compute_localization_stats_from_service(attribute_values, locale_filter=None):
    """
    Compute localization quality statistics from service-provided attribute values.
    
    Args:
        attribute_values: List of attribute values from the product analytics service
        locale_filter: Optional locale code to filter by
    
    Returns:
        dict: Dictionary with overall stats and locale-specific stats
    """
    # Group attribute values by locale
    locale_groups = {}
    
    for av in attribute_values:
        locale_code = av.locale or 'default'
        
        if locale_filter and locale_code != locale_filter:
            continue
            
        if locale_code not in locale_groups:
            locale_groups[locale_code] = {
                'total': 0,
                'translated': 0
            }
        
        # Count this attribute
        locale_groups[locale_code]['total'] += 1
        
        # Check if it has a value
        if av.value and str(av.value).strip():
            locale_groups[locale_code]['translated'] += 1
    
    # Prepare the stats for each locale
    locale_stats = []
    total_all = 0
    translated_all = 0
    
    for locale_code, counts in locale_groups.items():
        total = counts['total']
        translated = counts['translated']
        
        total_all += total
        translated_all += translated
        
        # Calculate percentage, avoiding division by zero
        translated_pct = (translated / total * 100) if total > 0 else 0
        
        locale_stats.append({
            'locale': locale_code,
            'total_attributes': total,
            'translated_attributes': translated,
            'translated_pct': round(translated_pct, 1)
        })
    
    # Sort by locale code
    locale_stats.sort(key=lambda x: x['locale'])
    
    # Calculate overall stats
    overall_pct = (translated_all / total_all * 100) if total_all > 0 else 0
    
    overall_stats = {
        'total_attributes': total_all,
        'translated_attributes': translated_all,
        'translated_pct': round(overall_pct, 1)
    }
    
    return {
        'overall': overall_stats,
        'locale_stats': locale_stats
    }


def _get_localization_quality_stats_db(
    user=None,
    from_date=None,
    to_date=None,
    locale=None,
    category=None,
    channel=None,
    family=None
):
    """
    Original implementation using direct database access.
    Used as a fallback if the product analytics service is not available.
    """
    # Base queryset filtered by organization
    queryset = AttributeValue.objects.all()
    
    # Filter by organization if user is provided
    if user and not user.is_superuser:
        # Assuming products have an organization field or similar
        queryset = queryset.filter(product__organization=user.organization)
    
    # Apply date filters if provided
    if from_date:
        try:
            from_date = datetime.fromisoformat(from_date)
            queryset = queryset.filter(updated_at__gte=from_date)
        except (ValueError, TypeError):
            pass
    
    if to_date:
        try:
            to_date = datetime.fromisoformat(to_date)
            queryset = queryset.filter(updated_at__lte=to_date)
        except (ValueError, TypeError):
            pass
    
    # Apply locale filter if provided
    if locale:
        queryset = queryset.filter(locale__code=locale)
    
    # Apply category filter if provided
    if category:
        queryset = queryset.filter(product__categories__id=category)
    
    # Apply channel filter if provided
    if channel:
        queryset = queryset.filter(channel__id=channel)
    
    # Apply family filter if provided
    if family:
        queryset = queryset.filter(product__family__id=family)
    
    # Create a subquery to get all distinct attribute-locale combinations
    # that should theoretically exist based on products and their attributes
    total_attributes_by_locale = (
        AttributeValue.objects
        .filter(product__in=queryset.values('product').distinct())
        .values('locale__code')
        .annotate(
            total_attributes=Count('attribute', distinct=True),
        )
    )
    
    # Get counts of non-empty attribute values by locale
    translated_attributes_by_locale = (
        queryset
        .exclude(Q(value__isnull=True) | Q(value=''))
        .values('locale__code')
        .annotate(
            translated_attributes=Count('attribute', distinct=True),
        )
    )
    
    # Combine the results
    locale_stats = {}
    
    # Process total attributes by locale
    for stat in total_attributes_by_locale:
        locale_code = stat['locale__code']
        if locale_code not in locale_stats:
            locale_stats[locale_code] = {
                'locale': locale_code,
                'total_attributes': 0,
                'translated_attributes': 0,
                'translated_pct': 0,
            }
        locale_stats[locale_code]['total_attributes'] = stat['total_attributes']
    
    # Process translated attributes by locale
    for stat in translated_attributes_by_locale:
        locale_code = stat['locale__code']
        if locale_code not in locale_stats:
            # This shouldn't happen, but just to be safe
            locale_stats[locale_code] = {
                'locale': locale_code,
                'total_attributes': 0,
                'translated_attributes': 0,
                'translated_pct': 0,
            }
        locale_stats[locale_code]['translated_attributes'] = stat['translated_attributes']
    
    # Calculate percentages and round to 1 decimal place
    total_all = 0
    translated_all = 0
    
    for locale_code, stats in locale_stats.items():
        total_attrs = stats['total_attributes']
        translated_attrs = stats['translated_attributes']
        
        total_all += total_attrs
        translated_all += translated_attrs
        
        if total_attrs > 0:
            translated_pct = (translated_attrs / total_attrs) * 100
            # Round to 1 decimal place
            stats['translated_pct'] = round(translated_pct, 1)
    
    # Calculate overall stats
    overall_stats = {
        'total_attributes': total_all,
        'translated_attributes': translated_all,
        'translated_pct': round((translated_all / total_all) * 100, 1) if total_all > 0 else 0,
    }
    
    # Convert dictionary to list for serialization
    locale_stats_list = list(locale_stats.values())
    
    # Sort by locale code
    locale_stats_list.sort(key=lambda x: x['locale'])
    
    return {
        'overall': overall_stats,
        'locale_stats': locale_stats_list,
    } 