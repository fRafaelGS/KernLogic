import hashlib, json
from django.core.cache import cache
from django.http import HttpResponse
import time
from django.utils import timezone
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction

User = get_user_model()

class IdempotencyMiddleware:
    """
    Save response body & status for 5 min when request includes
      Idempotency-Key header on unsafe methods (POST/PUT/PATCH).
    """
    TTL = 300  # seconds

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        key = request.META.get("HTTP_IDEMPOTENCY_KEY")
        if request.method in ("POST", "PUT", "PATCH") and key:
            cache_key = f"idemp:{hashlib.sha256(key.encode()).hexdigest()}"
            cached = cache.get(cache_key)
            if cached:
                status_code, body, content_type = cached
                return HttpResponse(body, status=status_code, content_type=content_type)
            
            response = self.get_response(request)
            
            # Only cache if it's a successful response
            if 200 <= response.status_code < 400:
                # Handle missing Content-Type header
                content_type = response.get("Content-Type", "application/json")
                cache.set(cache_key, (response.status_code, response.content, content_type), self.TTL)
            
            return response
        return self.get_response(request)

class UserActivityMiddleware:
    """
    Updates a user's last_login timestamp on authenticated API requests.
    This ensures the "Last Active" display is accurate in the UI.
    
    To avoid excessive database writes, updates are throttled based on
    settings.LAST_ACTIVITY_UPDATE_INTERVAL (defaults to 5 minutes).
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        # Default to 5 minutes if not configured
        self.update_interval = getattr(settings, 'LAST_ACTIVITY_UPDATE_INTERVAL', 5 * 60)
        
    def __call__(self, request):
        # Skip session-related endpoints to avoid circular updates
        skip_paths = [
            '/api/token/', 
            '/api/token/refresh/'
        ]
        
        # Process the request
        response = self.get_response(request)
        
        # After view is called, update last_login if needed
        if request.user.is_authenticated and not any(request.path.startswith(path) for path in skip_paths):
            # Only update last_login periodically to avoid excessive writes
            should_update = True
            
            # Check if we should throttle updates
            if self.update_interval > 0 and request.user.last_login:
                time_since_update = (timezone.now() - request.user.last_login).total_seconds()
                should_update = time_since_update > self.update_interval
            
            if should_update:
                try:
                    with transaction.atomic():
                        # Get a fresh user instance to avoid race conditions
                        User.objects.filter(pk=request.user.pk).update(last_login=timezone.now())
                except Exception as e:
                    # Log but don't disrupt the request
                    print(f"ERROR updating last_login for user {request.user.pk}: {str(e)}")
        
        return response 