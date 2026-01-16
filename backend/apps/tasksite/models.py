# models.py
from django.db import models
from apps.users.models import User

# --- IMPORT YOUR EXISTING PROJECT MODEL ---
# CAUTION: Check this path. It might be 'apps.projects.models' or similar
# based on where your "Marketing Campaign 2025" model is defined.
from apps.projects.models import Project, Label

class Task(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('review', 'Review'),
        ('deployed', 'Deployed'),
        ('deferred', 'Deferred'),
        ('backlog', 'Backlog')
       
    )

    PRIORITY_CHOICES = (
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    )


    heading = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    start_date = models.DateTimeField(null=True, blank=True)
    end_date = models.DateTimeField(null=True, blank=True)
    duration_time = models.DurationField(null=True, blank=True)
    
    priority = models.CharField(
        max_length=20, 
        choices=PRIORITY_CHOICES, 
        default='medium'
    )
    labels = models.ManyToManyField(
        Label, 
        blank=True, 
        related_name='tasks'
    )

    # --- UPDATED: LINK TO EXISTING PROJECT ---
    # We removed 'project_name' and added a ForeignKey to 'Project'
    project = models.ForeignKey(
        Project,
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='tasks'
    )
    # ----------------------------------------

    assigned_to = models.ManyToManyField(User, related_name='assigned_tasks')
    assigned_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='created_tasks'
    )
    
    status = models.CharField(
        max_length=20, 
        choices=STATUS_CHOICES, 
        default='pending'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.heading
    
class TaskLink(models.Model):
    task = models.ForeignKey(
        Task, 
        related_name='links',  # Access links via task.links.all()
        on_delete=models.CASCADE
    )
    url = models.URLField(max_length=500)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.url
    
class TaskAttachment(models.Model):
    task = models.ForeignKey(
        Task, 
        related_name='attachments',  # This name is crucial for the serializer
        on_delete=models.CASCADE
    )
    file = models.FileField(upload_to='task_documents/')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"File for task {self.task_id}"
    
class TaskComment(models.Model):
    task = models.ForeignKey(
        Task, 
        related_name='comments', 
        on_delete=models.CASCADE
    )
    user = models.ForeignKey(
        User, 
        related_name='task_comments', 
        on_delete=models.CASCADE
    )
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Comment by {self.user.username} on {self.task.heading}"