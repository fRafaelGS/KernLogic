import hashlib, json
from django.core.cache import cache
from django.http import HttpResponse

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