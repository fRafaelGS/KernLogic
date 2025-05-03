import re
import warnings
import logging
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger('django')

class NumericOrgIdDeprecationMiddleware(MiddlewareMixin):
    """Middleware that warns about using deprecated numeric org ID routes."""
    
    def __init__(self, get_response):
        self.get_response = get_response
        # Regular expression to match numeric org ID routes
        self.numeric_pattern = re.compile(r'/api/orgs/(\d+)/')
        
    def process_request(self, request):
        # Check if path matches deprecated pattern
        if self.numeric_pattern.search(request.path):
            # Log warning
            logger.warning(
                f"Deprecated UUID organization ID used in URL: {request.path}. "
                f"Please use Numeric ID format instead."
            )
            
            # Also output to console for development environments
            warnings.warn(
                f"UUID organization ID in URL '{request.path}' is deprecated. "
                f"Please use Numeric ID format instead.",
                DeprecationWarning, 
                stacklevel=2
            )
        
        return None 