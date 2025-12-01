from django.contrib import admin

from .models import Issue, IssueActivity, IssueAttachment, IssueComment, IssueLink


class IssueLinkInline(admin.TabularInline):
    model = IssueLink
    fk_name = "issue" 
    extra = 0


class IssueCommentInline(admin.TabularInline):
    model = IssueComment
    extra = 0


@admin.register(Issue)
class IssueAdmin(admin.ModelAdmin):
    list_display = ["title", "project", "status", "priority", "issue_type", "created_at"]
    list_filter = ["project", "status", "priority", "issue_type", "auto_generated"]
    search_fields = ["title", "description"]
    inlines = [IssueLinkInline, IssueCommentInline]


@admin.register(IssueActivity)
class IssueActivityAdmin(admin.ModelAdmin):
    list_display = ["issue", "activity_type", "user", "timestamp"]
    list_filter = ["activity_type"]
