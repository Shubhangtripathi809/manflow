"""
Project management models for ZanFlow.
"""
from django.conf import settings as django_settings
from django.db import models

from core.models import UserStampedModel


class Project(UserStampedModel):
    """
    Project containing documents, ground truth, and test runs.
    """
    
    class TaskType(models.TextChoices):
        KEY_VALUE_EXTRACTION = "key_value", "Key-Value Extraction"
        TABLE_EXTRACTION = "table", "Table Extraction"
        DOCUMENT_CLASSIFICATION = "classification", "Document Classification"
        OCR = "ocr", "OCR"
        NER = "ner", "Named Entity Recognition"
        CONTENT_CREATION = "content_creation", "Content Creation"
    
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    task_type = models.CharField(
        max_length=50,
        choices=TaskType.choices,
        default=TaskType.KEY_VALUE_EXTRACTION,
    )
    
    # Project settings (JSON)
    project_settings = models.JSONField(default=dict, blank=True)
    # Example settings:
    # {
    #     "metrics": ["accuracy", "precision", "recall", "f1"],
    #     "comparison_rules": {
    #         "ignore_whitespace": true,
    #         "case_sensitive": false,
    #         "numeric_tolerance": 0.01
    #     },
    #     "required_fields": ["field1", "field2"]
    # }
    
    # Default labels for this project
    default_labels = models.JSONField(default=list, blank=True)
    
    # Default assignees (for issues, reviews, etc.)
    default_assignees = models.ManyToManyField(
        django_settings.AUTH_USER_MODEL,
        related_name="assigned_projects",
        blank=True,
    )
    
    # Project members with access
    members = models.ManyToManyField(
        django_settings.AUTH_USER_MODEL,
        through="ProjectMembership",
        related_name="projects",
    )
    
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = "projects"
        ordering = ["-created_at"]
    
    def __str__(self):
        return self.name


class ProjectMembership(models.Model):
    """
    Project membership with role-based access.
    """
    
    class Role(models.TextChoices):
        OWNER = "owner", "Owner"
        ADMIN = "admin", "Admin"
        MEMBER = "member", "Member"
        VIEWER = "viewer", "Viewer"
    
    project = models.ForeignKey(Project, on_delete=models.CASCADE)
    user = models.ForeignKey(django_settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.MEMBER)
    joined_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = "project_memberships"
        unique_together = ["project", "user"]
    
    def __str__(self):
        return f"{self.user} - {self.project} ({self.role})"


class Label(UserStampedModel):
    """
    Labels for categorizing documents, issues, etc.
    """
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="labels",
    )
    name = models.CharField(max_length=100)
    color = models.CharField(max_length=7, default="#6366f1")  # Hex color
    description = models.TextField(blank=True)
    is_default = models.BooleanField(default=False)
    
    class Meta:
        db_table = "labels"
        unique_together = ["project", "name"]
        ordering = ["name"]
    
    def __str__(self):
        return f"{self.name} ({self.project.name})"
    
