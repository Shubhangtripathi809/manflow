"""
Testing and results models for ZanFlow (Phase 2).
"""
import uuid

from django.conf import settings
from django.db import models

from apps.groundtruth.models import Document, GTVersion
from apps.projects.models import Project
from core.models import UserStampedModel


def test_output_path(instance, filename):
    """Generate upload path for test outputs."""
    return f"projects/{instance.test_run.project_id}/test_runs/{instance.test_run_id}/outputs/{filename}"


def debug_data_path(instance, filename):
    """Generate upload path for debug data."""
    return f"projects/{instance.test_run.project_id}/test_runs/{instance.test_run_id}/debug/{filename}"


class TestRun(UserStampedModel):
    """
    A test run comparing model outputs against ground truth.
    """
    
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        RUNNING = "running", "Running"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"
        CANCELLED = "cancelled", "Cancelled"
    
    class TriggerType(models.TextChoices):
        MANUAL = "manual", "Manual"
        API = "api", "API"
        SCHEDULED = "scheduled", "Scheduled"
        CI_CD = "ci_cd", "CI/CD"
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="test_runs",
    )
    
    name = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    triggered_by = models.CharField(max_length=20, choices=TriggerType.choices, default=TriggerType.MANUAL)
    
    # Configuration
    config = models.JSONField(default=dict, blank=True)
    # Example: {"document_ids": [...], "metrics": ["accuracy", "f1"], "model_version": "v1.2"}
    
    # Results summary
    summary_metrics = models.JSONField(default=dict, blank=True)
    # Example: {"accuracy": 0.95, "precision": 0.92, "recall": 0.98, "f1": 0.95}
    
    # S3 paths for bulk outputs
    s3_output_path = models.CharField(max_length=500, blank=True)
    
    # Timing
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # Error tracking
    error_message = models.TextField(blank=True)
    
    class Meta:
        db_table = "test_runs"
        ordering = ["-created_at"]
    
    def __str__(self):
        return f"{self.project.name} - {self.name or self.id}"
    
    @property
    def duration_seconds(self):
        if self.started_at and self.completed_at:
            return (self.completed_at - self.started_at).total_seconds()
        return None
    
    @property
    def result_count(self):
        return self.results.count()
    
    @property
    def pass_count(self):
        return self.results.filter(status="pass").count()
    
    @property
    def fail_count(self):
        return self.results.filter(status="fail").count()


class TestResult(UserStampedModel):
    """
    Individual test result for a document.
    """
    
    class Status(models.TextChoices):
        PASS = "pass", "Pass"
        FAIL = "fail", "Fail"
        ERROR = "error", "Error"
        SKIPPED = "skipped", "Skipped"
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    test_run = models.ForeignKey(
        TestRun,
        on_delete=models.CASCADE,
        related_name="results",
    )
    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name="test_results",
    )
    gt_version = models.ForeignKey(
        GTVersion,
        on_delete=models.SET_NULL,
        null=True,
        related_name="test_results",
    )
    
    status = models.CharField(max_length=20, choices=Status.choices)
    
    # Extracted data from model
    extracted_data = models.JSONField(default=dict)
    
    # Per-document metrics
    metrics = models.JSONField(default=dict, blank=True)
    # Example: {"accuracy": 0.9, "field_scores": {"invoice_number": 1.0, "total": 0.8}}
    
    # Computed diff
    diff_data = models.JSONField(default=dict, blank=True)
    # Example: {"matched": [...], "mismatched": [...], "missing": [...], "extra": [...]}
    
    # Debug data
    debug_data = models.JSONField(default=dict, blank=True)
    debug_file = models.FileField(upload_to=debug_data_path, null=True, blank=True)
    
    # Error info
    error_message = models.TextField(blank=True)
    
    class Meta:
        db_table = "test_results"
        ordering = ["document__name"]
        unique_together = ["test_run", "document"]
    
    def __str__(self):
        return f"{self.document.name} - {self.status}"
