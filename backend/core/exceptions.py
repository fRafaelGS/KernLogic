import logging
from django.http import JsonResponse
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.views import exception_handler
from rest_framework import exceptions, status

logger = logging.getLogger('core.exceptions')

# Map of DRF exceptions to Problem types
EXCEPTION_TYPE_MAP = {
    'ValidationError': 'https://kernlogic/errors/validation',
    'AuthenticationFailed': 'https://kernlogic/errors/authentication',
    'NotAuthenticated': 'https://kernlogic/errors/authentication',
    'PermissionDenied': 'https://kernlogic/errors/permission',
    'NotFound': 'https://kernlogic/errors/not_found',
    'MethodNotAllowed': 'https://kernlogic/errors/method_not_allowed',
    'NotAcceptable': 'https://kernlogic/errors/not_acceptable',
    'UnsupportedMediaType': 'https://kernlogic/errors/unsupported_media_type',
    'Throttled': 'https://kernlogic/errors/throttled',
    'ParseError': 'https://kernlogic/errors/parse_error',
}

def get_error_title(exc):
    """Get a human-readable title for an exception"""
    
    exc_name = exc.__class__.__name__
    
    # Map common exceptions to more user-friendly titles
    title_map = {
        'ValidationError': 'Validation Error',
        'AuthenticationFailed': 'Authentication Failed',
        'NotAuthenticated': 'Not Authenticated',
        'PermissionDenied': 'Permission Denied',
        'NotFound': 'Not Found',
        'MethodNotAllowed': 'Method Not Allowed',
        'NotAcceptable': 'Not Acceptable',
        'UnsupportedMediaType': 'Unsupported Media Type',
        'Throttled': 'Too Many Requests',
        'ParseError': 'Parse Error',
    }
    
    return title_map.get(exc_name, 'Server Error')

def get_error_detail(exc):
    """Extract the detail from an exception"""
    
    if hasattr(exc, 'detail'):
        if isinstance(exc.detail, dict):
            # Flatten dict details into a single string
            details = []
            for field, errors in exc.detail.items():
                if isinstance(errors, list):
                    for error in errors:
                        details.append(f"{field}: {error}")
                else:
                    details.append(f"{field}: {errors}")
            return "; ".join(details)
        elif isinstance(exc.detail, list):
            return "; ".join([str(item) for item in exc.detail])
        else:
            return str(exc.detail)
    
    return str(exc)

def custom_exception_handler(exc, context):
    """
    Custom exception handler that returns problems in a JSON:API Problem format.
    """
    # First, get the standard DRF response
    response = exception_handler(exc, context)
    
    # If there's no response, it's an unhandled exception
    if response is None:
        logger.exception('Unhandled exception', exc_info=exc)
        return JsonResponse({
            'type': 'https://kernlogic/errors/server_error',
            'title': 'Server Error',
            'detail': 'An unexpected error occurred',
            'status': 500,
            'instance': context['request'].path if 'request' in context else None
        }, status=500)
    
    # Get the exception class name
    exc_name = exc.__class__.__name__
    
    # Create the problem response
    problem = {
        'type': EXCEPTION_TYPE_MAP.get(exc_name, 'https://kernlogic/errors/server_error'),
        'title': get_error_title(exc),
        'detail': get_error_detail(exc),
        'status': response.status_code,
        'instance': context['request'].path if 'request' in context else None
    }
    
    # Add field-specific errors for validation errors
    if exc_name == 'ValidationError' and hasattr(exc, 'detail') and isinstance(exc.detail, dict):
        problem['errors'] = exc.detail
    
    return JsonResponse(problem, status=response.status_code)

class BusinessLogicError(exceptions.APIException):
    """
    Exception for business logic errors.
    This is for errors that are expected and handled, not for server errors.
    """
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    default_detail = 'A business logic error occurred.'
    default_code = 'error'
    
    def __init__(self, detail=None, code=None, status_code=None):
        super().__init__(detail, code)
        if status_code is not None:
            self.status_code = status_code 