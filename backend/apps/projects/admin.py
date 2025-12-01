from django.contrib import admin

from .models import Label, Project, ProjectMembership


class ProjectMembershipInline(admin.TabularInline):
    model = ProjectMembership
    extra = 0


class LabelInline(admin.TabularInline):
    model = Label
    extra = 0


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ["name", "task_type", "is_active", "created_by", "created_at"]
    list_filter = ["task_type", "is_active", "created_at"]
    search_fields = ["name", "description"]
    inlines = [ProjectMembershipInline, LabelInline]


@admin.register(Label)
class LabelAdmin(admin.ModelAdmin):
    list_display = ["name", "project", "color", "is_default"]
    list_filter = ["project", "is_default"]
