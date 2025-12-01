from django.contrib import admin

from .models import TestResult, TestRun


@admin.register(TestRun)
class TestRunAdmin(admin.ModelAdmin):
    list_display = ["id", "project", "status", "triggered_by", "created_at"]
    list_filter = ["project", "status", "triggered_by"]


@admin.register(TestResult)
class TestResultAdmin(admin.ModelAdmin):
    list_display = ["document", "test_run", "status"]
    list_filter = ["status", "test_run"]
