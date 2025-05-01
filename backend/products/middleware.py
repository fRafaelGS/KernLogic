import json
from django.utils.deprecation import MiddlewareMixin

class AssetRequestMiddleware(MiddlewareMixin):
    """
    Middleware to add missing required fields to asset requests
    """
    def process_request(self, request):
        # Only process POST requests to the assets endpoint
        if (request.method == 'POST' and 
            'assets' in request.path and 
            'products' in request.path):
            
            # Handle multipart form data
            if request.content_type and 'multipart/form-data' in request.content_type:
                if 'is_archived' not in request.POST:
                    request.POST._mutable = True
                    request.POST['is_archived'] = False
                    request.POST._mutable = False
            
            # Handle JSON data
            elif request.content_type and 'application/json' in request.content_type:
                try:
                    body = json.loads(request.body.decode('utf-8'))
                    if 'is_archived' not in body:
                        body['is_archived'] = False
                        request._body = json.dumps(body).encode('utf-8')
                except (ValueError, json.JSONDecodeError):
                    pass
        
        return None 