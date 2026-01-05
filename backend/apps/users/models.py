from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    """
    Custom User model with role-based access control.
    """
    
    class Role(models.TextChoices):
        ADMIN = "admin", "Admin"
        MANAGER = "manager", "Manager"
        ANNOTATOR = "annotator", "Annotator"
        VIEWER = "viewer", "Viewer"
    class SkillProficiency(models.TextChoices):
        LEARNING = "Learning", "Learning"
        BEGINNER = "Beginner", "Beginner"
        INTERMEDIATE = "Intermediate", "Intermediate"
        ADVANCE = "Advance", "Advance"

    class SkillCategory(models.TextChoices):
        FRONTEND = "frontend", "frontend"
        BACKEND = "backend", "backend"
        DEVOPS = "Devops", "Devops"
        SOCIAL_MEDIA = "Social Media", "Social Media"
        MANAGEMENT = "Management", "Management"
        MARKETING = "Marketing", "Marketing"
        CONTENT_CREATOR = "Content creator", "Content creator"
        OTHER = "other", "other"
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.ANNOTATOR,
    )
    avatar = models.ImageField(upload_to="avatars/", null=True, blank=True)

    # NEW: Store skills as a list of strings
    skills = models.JSONField(default=list, blank=True)
    
    class Meta:
        db_table = "users"
        ordering = ["username"]
    
    def __str__(self):
        return self.username

    def save(self, *args, **kwargs):
        # If the user is a superuser, force the role to be ADMIN
        if self.is_superuser:
            self.role = self.Role.ADMIN
        super().save(*args, **kwargs)
    
    @property
    def is_admin(self):
        return self.role == self.Role.ADMIN or self.is_superuser
    
    @property
    def is_manager(self):
        return self.role in [self.Role.ADMIN, self.Role.MANAGER] or self.is_superuser
    
    @property
    def can_annotate(self):
        return self.role in [self.Role.ADMIN, self.Role.MANAGER, self.Role.ANNOTATOR]