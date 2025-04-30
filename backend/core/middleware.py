import re
import logging
import json
from django.conf import settings
import django.core.cache
import hashlib

logger = logging.getLogger('core.middleware')

class LegacyAPIWarningMiddleware:
    """
    Middleware to log warnings when unversioned API paths are used.
    Also adds a header to indicate to the frontend that a legacy route was used.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Only check API requests
        if request.path.startswith('/api/') and not request.path.startswith('/api/v1/'):
            if not request.path.startswith('/api/token/') and not request.path.startswith('/api/schema/'):
                # Log a warning for unversioned API paths
                logger.warning(f"Legacy unversioned API path used: {request.path}")
                
                # Add a custom header for the frontend
                response = self.get_response(request)
                response['X-Legacy-Route'] = 'true'
                return response
        
        return self.get_response(request)


class IdempotencyKeyMiddleware:
    """
    Middleware to handle idempotency keys for mutating requests.
    Caches the response for a given idempotency key and returns the cached 
    response if the same key is used again within the cache period.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.cache = django.core.cache.caches['default']
        self.max_content_size = 1024 * 1024  # 1MB
    
    def __call__(self, request):
        # Only process POST, PUT, PATCH, DELETE requests
        if request.method not in ('POST', 'PUT', 'PATCH', 'DELETE'):
            return self.get_response(request)
            
        # Get the idempotency key from headers
        idempotency_key = request.headers.get('Idempotency-Key')
        
        # If no key provided, just process the request normally
        if not idempotency_key:
            return self.get_response(request)
        
        # Create a cache key from the idempotency key and path
        # This allows the same idempotency key to be used for different endpoints
        cache_key = f"idempotency:{idempotency_key}:{request.path}"
        
        # Check if we have a cached response
        cached_response = self.cache.get(cache_key)
        if cached_response:
            # Return the cached response
            logger.info(f"Returning cached response for idempotency key: {idempotency_key}")
            return self._build_response_from_cache(cached_response)
        
        # Process the request
        response = self.get_response(request)
        
        # Only cache if the response was successful (2xx)
        if 200 <= response.status_code < 300:
            # Check the content size
            if len(response.content) > self.max_content_size:
                # Response is too large to cache, return 413 Payload Too Large
                logger.warning(f"Response too large to cache for idempotency key: {idempotency_key}")
                response.status_code = 413
                response.content = json.dumps({
                    "type": "https://kernlogic/errors/payload_too_large",
                    "title": "Payload Too Large",
                    "detail": "The response is too large to be cached for idempotency purposes.",
                    "status": 413,
                    "instance": request.path
                }).encode('utf-8')
            else:
                # Cache the response
                self._cache_response(cache_key, response)
                
                # Add a header to indicate this was a new request
                response['X-Idempotency-Key'] = idempotency_key
        
        return response
    
    def _cache_response(self, cache_key, response):
        """
        Cache the response for 5 minutes
        """
        # Create a cacheable representation of the response
        cache_data = {
            'status_code': response.status_code,
            'content': response.content.decode('utf-8'),
            'headers': dict(response.headers),
        }
        
        # Cache for 5 minutes
        self.cache.set(cache_key, cache_data, timeout=300)
    
    def _build_response_from_cache(self, cached_data):
        """
        Reconstruct a response from cached data
        """
        from django.http import HttpResponse
        
        # Create a new response
        response = HttpResponse(
            content=cached_data['content'],
            status=cached_data['status_code'],
            content_type=cached_data['headers'].get('Content-Type', 'application/json')
        )
        
        # Add the headers
        for key, value in cached_data['headers'].items():
            if key not in ('Content-Length',):  # Skip certain headers
                response[key] = value
                
        # Add a header to indicate this was from cache
        response['X-Idempotency-From-Cache'] = 'true'
        
        return response 