"""
Issue tracking models for ZanFlow (Phase 3).
"""
import uuid

from django.conf import settings
from django.db import models

from apps.groundtruth.models import Document, GTVersion
from apps.projects.models import Label, Project
from apps.testing.models import TestResult, TestRun
from core.models import UserStampedModel


def issue_attachment_path(instance, filename):
    """Generate upload path for issue attachments."""
    return f"projects/{instance.issue.project_id}/issues/{instance.issue_id}/attachments/{filename}"


class Issue(UserStampedModel):
    """
    Issue for tracking problems, tasks, and improvements.
    """
    
    class Status(models.TextChoices):
        OPEN = "open", "Open"
        IN_PROGRESS = "in_progress", "In Progress"
        IN_REVIEW = "in_review", "In Review"
        RESOLVED = "resolved", "Resolved"
        CLOSED = "closed", "Closed"
        WONT_FIX = "wont_fix", "Won't Fix"
    
    class Priority(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"
        CRITICAL = "critical", "Critical"
    
    class IssueType(models.TextChoices):
        BUG = "bug", "Bug"
        TASK = "task", "Task"
        IMPROVEMENT = "improvement", "Improvement"
        GT_CORRECTION = "gt_correction", "GT Correction"
        AUTO_GENERATED = "auto_generated", "Auto Generated"
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="issues",
    )
    
    title = models.CharField(max_length=500)
    description = models.TextField(blank=True)
    
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    priority = models.CharField(max_length=20, choices=Priority.choices, default=Priority.MEDIUM)
    issue_type = models.CharField(max_length=20, choices=IssueType.choices, default=IssueType.BUG)
    
    # Labels
    labels = models.ManyToManyField(Label, related_name="issues", blank=True)
    
    # Assignees
    assignees = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="assigned_issues",
        blank=True,
    )
    
    # Due date
    due_date = models.DateField(null=True, blank=True)
    
    # Parent issue for grouping/binning
    parent_issue = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="child_issues",
    )
    
    # Auto-generation metadata
    auto_generated = models.BooleanField(default=False)
    error_category = models.CharField(max_length=100, blank=True)  # For binning
    error_pattern = models.TextField(blank=True)  # Pattern that triggered auto-creation
    
    # Resolution
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="resolved_issues",
    )
    resolution_notes = models.TextField(blank=True)
    
    class Meta:
        db_table = "issues"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["project", "status"]),
            models.Index(fields=["project", "priority"]),
            models.Index(fields=["error_category"]),
        ]
    
    def __str__(self):
        return f"{self.title} ({self.status})"
    
    @property
    def child_count(self):
        return self.child_issues.count()


class IssueLink(UserStampedModel):
    """
    Links between issues and other objects.
    """
    
    class LinkType(models.TextChoices):
        DOCUMENT = "document", "Document"
        GT_VERSION = "gt_version", "GT Version"
        TEST_RUN = "test_run", "Test Run"
        TEST_RESULT = "test_result", "Test Result"
        ISSUE = "issue", "Related Issue"
    
    issue = models.ForeignKey(
        Issue,
        on_delete=models.CASCADE,
        related_name="links",
    )
    link_type = models.CharField(max_length=20, choices=LinkType.choices)
    
    # Generic links - only one should be set based on link_type
    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="issue_links",
    )
    gt_version = models.ForeignKey(
        GTVersion,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="issue_links",
    )
    test_run = models.ForeignKey(
        TestRun,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="issue_links",
    )
    test_result = models.ForeignKey(
        TestResult,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="issue_links",
    )
    related_issue = models.ForeignKey(
        Issue,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="related_links",
    )
    
    notes = models.TextField(blank=True)
    
    class Meta:
        db_table = "issue_links"
    
    def __str__(self):
        return f"{self.issue.title} -> {self.link_type}"


class IssueAttachment(UserStampedModel):
    """
    File attachments for issues.
    """
    issue = models.ForeignKey(
        Issue,
        on_delete=models.CASCADE,
        related_name="attachments",
    )
    file = models.FileField(upload_to=issue_attachment_path)
    file_name = models.CharField(max_length=255)
    file_type = models.CharField(max_length=100, blank=True)
    file_size = models.PositiveIntegerField(default=0)
    
    class Meta:
        db_table = "issue_attachments"
        ordering = ["-created_at"]
    
    def __str__(self):
        return f"{self.file_name} on {self.issue.title}"
    
    def save(self, *args, **kwargs):
        if self.file and not self.file_size:
            self.file_size = self.file.size
        super().save(*args, **kwargs)


class IssueComment(UserStampedModel):
    """
    Comments on issues.
    """
    issue = models.ForeignKey(
        Issue,
        on_delete=models.CASCADE,
        related_name="comments",
    )
    content = models.TextField()
    
    # Edit tracking
    edited_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = "issue_comments"
        ordering = ["created_at"]
    
    def __str__(self):
        return f"Comment on {self.issue.title} by {self.created_by}"


class IssueActivity(models.Model):
    """
    Activity log for issue changes.
    """
    
    class ActivityType(models.TextChoices):
        CREATED = "created", "Created"
        STATUS_CHANGED = "status_changed", "Status Changed"
        PRIORITY_CHANGED = "priority_changed", "Priority Changed"
        ASSIGNED = "assigned", "Assigned"
        UNASSIGNED = "unassigned", "Unassigned"
        LABEL_ADDED = "label_added", "Label Added"
        LABEL_REMOVED = "label_removed", "Label Removed"
        COMMENT_ADDED = "comment_added", "Comment Added"
        ATTACHMENT_ADDED = "attachment_added", "Attachment Added"
        LINK_ADDED = "link_added", "Link Added"
        RESOLVED = "resolved", "Resolved"
        REOPENED = "reopened", "Reopened"
    
    issue = models.ForeignKey(
        Issue,
        on_delete=models.CASCADE,
        related_name="activities",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
    )
    activity_type = models.CharField(max_length=30, choices=ActivityType.choices)
    
    old_value = models.CharField(max_length=255, blank=True)
    new_value = models.CharField(max_length=255, blank=True)
    
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = "issue_activities"
        ordering = ["-timestamp"]
    
    def __str__(self):
        return f"{self.activity_type} on {self.issue.title}"
