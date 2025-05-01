from rest_framework.exceptions import APIException
from rest_framework import status
from rest_framework.views import exception_handler as drf_handler
from rest_framework.response import Response
import logging

logger = logging.getLogger('django')

class KLAPIException(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Something went wrong"
    default_code = "kl_error"

    def __init__(self, detail=None, *, status_code=None, type_="about:blank", instance=None):
        if status_code is not None:
            self.status_code = status_code
        super().__init__(detail)
        self.type_ = type_
        self.instance = instance

    def get_full_details(self):
        # DRF calls this before rendering
        return {
            "type": self.type_,
            "title": self.default_code.replace("_", " ").title(),
            "detail": self.detail,
            "status": self.status_code,
            "instance": self.instance or "",
        }

def custom_exception_handler(exc, context):
    """
    Custom exception handler that formats KLAPIExceptions as RFC7807 problem details
    and passes other exceptions to DRF's default handler.
    """
    try:
        # Log the exception for debugging purposes
        logger.error(f"Exception in {context.get('view').__class__.__name__}: {str(exc)}")
        
        # Use DRF for non-KL errors
        if not isinstance(exc, KLAPIException):
            return drf_handler(exc, context)

        data = exc.get_full_details()
        return Response(data, status=exc.status_code, content_type="application/problem+json")
    except Exception as e:
        # Log any errors in the exception handler itself
        logger.error(f"Error in exception handler: {str(e)}")
        # Fall back to the DRF handler if anything goes wrong
        return drf_handler(exc, context) 