from django.contrib import admin

from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ["timestamp", "user", "action", "content_type", "object_id", "ip_address"]
    list_filter = ["action", "content_type", "timestamp"]
    search_fields = ["user__username", "change_summary"]
    readonly_fields = [
        "user", "action", "content_type", "object_id",
        "old_value", "new_value", "change_summary",
        "ip_address", "user_agent", "timestamp",
    ]
    
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False
    
    def has_delete_permission(self, request, obj=None):
        return False
