"""
Audit logging service.
"""
from django.contrib.contenttypes.models import ContentType

from .middleware import get_client_ip, get_current_request, get_current_user
from .models import AuditLog


def log_action(
    obj,
    action: str,
    old_value: dict = None,
    new_value: dict = None,
    change_summary: str = "",
    user=None,
):
    """
    Log an audit action for an object.
    
    Args:
        obj: The Django model instance being audited
        action: The action type (create, update, delete, etc.)
        old_value: Previous state (for updates)
        new_value: New state (for creates/updates)
        change_summary: Human-readable summary of changes
        user: Override user (uses current request user if not provided)
    """
    if user is None:
        user = get_current_user()
    
    request = get_current_request()
    ip_address = None
    user_agent = ""
    
    if request:
        ip_address = get_client_ip(request)
        user_agent = request.META.get("HTTP_USER_AGENT", "")[:500]
    
    return AuditLog.objects.create(
        user=user,
        action=action,
        content_type=ContentType.objects.get_for_model(obj),
        object_id=obj.pk,
        old_value=old_value,
        new_value=new_value,
        change_summary=change_summary,
        ip_address=ip_address,
        user_agent=user_agent,
    )


def get_object_history(obj, limit: int = 50):
    """
    Get audit history for an object.
    """
    content_type = ContentType.objects.get_for_model(obj)
    return AuditLog.objects.filter(
        content_type=content_type,
        object_id=obj.pk,
    ).select_related("user")[:limit]
