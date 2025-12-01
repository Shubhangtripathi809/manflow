from django.contrib import admin

from .models import Document, DocumentComment, GTVersion


class GTVersionInline(admin.TabularInline):
    model = GTVersion
    extra = 0
    readonly_fields = ["version_number", "is_approved", "approved_at", "approved_by", "created_at"]


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ["name", "project", "status", "file_type", "version_count", "created_at"]
    list_filter = ["project", "status", "file_type", "created_at"]
    search_fields = ["name", "description"]
    inlines = [GTVersionInline]
    
    def version_count(self, obj):
        return obj.versions.count()


@admin.register(GTVersion)
class GTVersionAdmin(admin.ModelAdmin):
    list_display = ["document", "version_number", "is_approved", "created_by", "created_at"]
    list_filter = ["is_approved", "created_at"]
    search_fields = ["document__name"]
