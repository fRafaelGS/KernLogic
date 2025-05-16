"""
Example views demonstrating usage of the locale/channel context service.
This file is for reference only and is not imported by the main application.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from .services import get_locale_channel_context

class ExampleContextView(APIView):
    """Example view demonstrating how to use locale/channel context"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # Get locale and channel values with organization defaults as fallback
        locale, channel = get_locale_channel_context(request, request.user)
        
        # Now you can use these values for business logic
        # For example, filter data by locale and channel
        return Response({
            "current_locale": locale,
            "current_channel": channel,
            "message": f"Using locale={locale} and channel={channel} for the current request"
        })
        
# Example usage in an attribute value view
class ExampleAttributeValueView(APIView):
    """Example view demonstrating how to use locale/channel context for attribute values"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, product_id):
        # Get locale and channel from request with organization defaults as fallback
        locale, channel = get_locale_channel_context(request, request.user)
        
        # Example query using the context values
        # AttributeValue.objects.filter(
        #    product_id=product_id,
        #    locale=locale, 
        #    channel=channel
        # )
        
        return Response({
            "product_id": product_id,
            "locale": locale,
            "channel": channel,
            "message": "Retrieved attribute values with context"
        }) 