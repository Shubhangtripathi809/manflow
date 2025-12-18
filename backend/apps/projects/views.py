"""
Views for Projects app.
"""
import boto3
import uuid
import os
from botocore.exceptions import ClientError
from django.conf import settings
from django.db.models import Count, Q  # Added missing imports needed for logic
from django_filters import rest_framework as filters
# Removed: from rest_framework.decorators import action (No longer needed)
from rest_framework.response import Response
from rest_framework import status, viewsets
from apps.audit.services import get_object_history, log_action
from apps.groundtruth.models import Document  # Ensure this import exists
from apps.groundtruth.serializers import DocumentSerializer
from .models import Label, Project, ProjectMembership
from .serializers import (
    LabelSerializer,
    ProjectCreateSerializer,
    ProjectDetailSerializer,
    ProjectMembershipSerializer,
    ProjectSerializer,
    ProjectStatsSerializer,
)


class ProjectFilter(filters.FilterSet):
    """
    Filter for projects.
    """
    task_type = filters.ChoiceFilter(choices=Project.TaskType.choices)
    is_active = filters.BooleanFilter()
    
    class Meta:
        model = Project
        fields = ["task_type", "is_active"]


class ProjectViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Project CRUD operations.
    """
    queryset = Project.objects.all()
    filterset_class = ProjectFilter
    search_fields = ["name", "description"]
    ordering_fields = ["name", "created_at", "updated_at"]
    ordering = ["-created_at"]
    
    def get_serializer_class(self):
        if self.action == "create":
            return ProjectCreateSerializer
        if self.action == "retrieve":
            return ProjectDetailSerializer
        return ProjectSerializer
    
    def get_queryset(self):
        user = self.request.user
        if user.is_admin:
            return Project.objects.all()
        return Project.objects.filter(
            Q(members=user) | Q(created_by=user)
        ).distinct()
    
    def perform_create(self, serializer):
        # 1. Save the project first
        project = serializer.save(created_by=self.request.user)
        
        # 2. Automatically add the Creator as an OWNER
        ProjectMembership.objects.get_or_create(
            project=project,
            user=self.request.user,
            defaults={"role": ProjectMembership.Role.OWNER}
        )
        
        # 3. Handle "Assigned To" users from the frontend
        assigned_user_ids = self.request.data.get('assigned_to', []) 
        
        if assigned_user_ids:
            for user_id in assigned_user_ids:
                if str(user_id) != str(self.request.user.id):
                    ProjectMembership.objects.get_or_create(
                        project=project,
                        user_id=user_id,
                        defaults={"role": ProjectMembership.Role.MEMBER}
                    )

        log_action(project, "create", new_value=serializer.data)
    def get_download_url(self, request, pk=None):
        """
        Generates a URL based on Document ID using the 'source_file' field.
        """
        document_id = request.data.get("document_id") or request.query_params.get("document_id")
        
        if not document_id:
            # Fallback for manual file_key (optional)
            file_key = request.data.get("file_key")
            if not file_key:
                return Response({"detail": "document_id is required."}, status=status.HTTP_400_BAD_REQUEST)
        else:
            # LOOKUP THE KEY FROM DB
            try:
                # Ensure we import Document if not already imported at top of file
                from apps.groundtruth.models import Document 
                document = Document.objects.get(id=document_id, project_id=pk)
                
                # --- FIX IS HERE: Use source_file.name ---
                file_key = document.source_file.name 
                
            except Document.DoesNotExist:
                return Response({"detail": "Document not found."}, status=status.HTTP_404_NOT_FOUND)

        # Initialize S3 Client
        s3_client = boto3.client(
            "s3",
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION_NAME,
        )

        try:
            url = s3_client.generate_presigned_url(
                ClientMethod='get_object',
                Params={
                    'Bucket': settings.AWS_STORAGE_BUCKET_NAME,
                    'Key': file_key,
                },
                ExpiresIn=3600 
            )
        except ClientError as e:
            return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({"url": url})
    
    def confirm_upload(self, request, pk=None):
        project = self.get_object()
        
        file_key = request.data.get("file_key")
        file_name = request.data.get("file_name")
        # 1. Get the file_type from the Frontend request
        file_type = request.data.get("file_type") 
        
        if not file_key or not file_name:
            return Response(
                {"detail": "file_key and file_name are required."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        document = Document.objects.create(
            project=project,
            name=file_name,
            source_file=file_key,
            # 2. Save it to the database!
            file_type=file_type, 
            status=Document.Status.DRAFT, 
            created_by=request.user
        )

        return Response(
            {"id": document.id, "status": "saved"}, 
            status=status.HTTP_201_CREATED
        )
    def perform_update(self, serializer):
        old_data = ProjectSerializer(self.get_object()).data
        project = serializer.save(updated_by=self.request.user)
        log_action(project, "update", old_value=old_data, new_value=serializer.data)
    
    def perform_destroy(self, instance):
        log_action(instance, "delete", old_value=ProjectSerializer(instance).data)
        instance.delete()

    # --- Custom Methods (Mapped explicitly in urls.py) ---

    def get_upload_url(self, request, pk=None):
        """
        Generates a Presigned Post URL with a UNIQUE filename.
        """
        project = self.get_object()
        
        file_name = request.data.get("file_name")
        file_type = request.data.get("file_type")
        
        if not file_name or not file_type:
            return Response(
                {"detail": "file_name and file_type are required."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # --- START OF CHANGES ---
        
        # 1. Split the filename to get the extension (e.g., ".pdf")
        _, file_extension = os.path.splitext(file_name)
        
        # 2. Generate a unique random filename (e.g., "a1b2c3d4-....pdf")
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        
        # 3. Use this unique name for the S3 Key
        s3_key = f"projects/{project.id}/documents/{unique_filename}"
        
        # --- END OF CHANGES ---

        # 4. Initialize the S3 client using credentials from settings.py
        s3_client = boto3.client(
            "s3",
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION_NAME,
        )

        try:
            # 5. Generate the secure URL
            presigned_data = s3_client.generate_presigned_post(
                Bucket=settings.AWS_STORAGE_BUCKET_NAME,
                Key=s3_key,
                Fields={
                    "Content-Type": file_type,
                },
                Conditions=[
                    {"Content-Type": file_type},
                    ["content-length-range", 0, 524288000],  # Max 500MB
                ],
                ExpiresIn=3600,  # Valid for 1 hour
            )
        except ClientError as e:
            return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # 6. Return URL to frontend
        return Response({
            "url": presigned_data["url"],
            "fields": presigned_data["fields"],
            "file_key": s3_key # This sends the NEW unique key back to the frontend
        })

    def stats(self, request, pk=None):
        """
        Get project statistics.
        """
        project = self.get_object()
        
        # Get document stats
        from apps.groundtruth.models import Document
        doc_stats = Document.objects.filter(project=project).aggregate(
            total=Count("id"),
            approved=Count("id", filter=Q(status=Document.Status.APPROVED)),
            pending=Count("id", filter=Q(status__in=[Document.Status.DRAFT, Document.Status.IN_REVIEW])),
        )
        
        # Get test run stats
        from apps.testing.models import TestRun
        test_runs = TestRun.objects.filter(project=project)
        latest_run = test_runs.order_by("-created_at").first()
        latest_accuracy = None
        if latest_run and latest_run.summary_metrics:
            latest_accuracy = latest_run.summary_metrics.get("accuracy")
        
        # Get issue stats
        from apps.issues.models import Issue
        open_issues = Issue.objects.filter(
            project=project,
            status__in=[Issue.Status.OPEN, Issue.Status.IN_PROGRESS],
        ).count()
        
        data = {
            "total_documents": doc_stats["total"],
            "approved_documents": doc_stats["approved"],
            "pending_documents": doc_stats["pending"],
            "total_test_runs": test_runs.count(),
            "latest_accuracy": latest_accuracy,
            "open_issues": open_issues,
        }
        
        serializer = ProjectStatsSerializer(data)
        return Response(serializer.data)
    
    def audit_log(self, request, pk=None):
        """
        Get audit log for project.
        """
        project = self.get_object()
        history = get_object_history(project)
        
        from apps.audit.models import AuditLog
        from rest_framework import serializers as drf_serializers
        
        class AuditLogSerializer(drf_serializers.ModelSerializer):
            user = drf_serializers.StringRelatedField()
            
            class Meta:
                model = AuditLog
                fields = ["id", "user", "action", "change_summary", "timestamp"]
        
        return Response(AuditLogSerializer(history, many=True).data)
    
    def add_member(self, request, pk=None):
        """
        Add a member to the project.
        """
        project = self.get_object()
        serializer = ProjectMembershipSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        membership, created = ProjectMembership.objects.get_or_create(
            project=project,
            user=serializer.validated_data["user"],
            defaults={"role": serializer.validated_data.get("role", ProjectMembership.Role.MEMBER)},
        )
        
        if not created:
            return Response(
                {"detail": "User is already a member"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        return Response(ProjectMembershipSerializer(membership).data, status=status.HTTP_201_CREATED)
    
    def remove_member(self, request, pk=None, user_id=None):
        """
        Remove a member from the project.
        """
        project = self.get_object()
        try:
            membership = ProjectMembership.objects.get(project=project, user_id=user_id)
            membership.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except ProjectMembership.DoesNotExist:
            return Response(
                {"detail": "User is not a member"},
                status=status.HTTP_404_NOT_FOUND,
            )


class LabelViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Label CRUD operations.
    """
    serializer_class = LabelSerializer
    
    def get_queryset(self):
        user = self.request.user
        if user.is_admin:
            return Project.objects.all()  # Note: logic kept as provided in original snippet
        
        # Regular users only see projects where they are Members OR the Creator
        return Project.objects.filter(
            Q(members=user) | Q(created_by=user)
        ).distinct()
    
    def perform_create(self, serializer):
        project_id = self.kwargs.get("project_pk")
        serializer.save(
            project_id=project_id,
            created_by=self.request.user,
        )

