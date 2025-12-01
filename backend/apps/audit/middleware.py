"""
Middleware to capture request context for audit logging.
"""
import threading

_request_context = threading.local()


def get_current_request():
    """Get the current request from thread local storage."""
    return getattr(_request_context, "request", None)


def get_current_user():
    """Get the current user from thread local storage."""
    request = get_current_request()
    if request and hasattr(request, "user") and request.user.is_authenticated:
        return request.user
    return None


def get_client_ip(request):
    """Extract client IP from request."""
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


class AuditMiddleware:
    """
    Middleware to store request context for audit logging.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        _request_context.request = request
        response = self.get_response(request)
        if hasattr(_request_context, "request"):
            del _request_context.request
        return response
