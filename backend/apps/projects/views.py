"""
Views for Projects app.
"""
import boto3
from botocore.exceptions import ClientError
from django.conf import settings
from django_filters import rest_framework as filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status, viewsets
from apps.audit.services import get_object_history, log_action

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
        # This ensures the creator can always see their own project
        ProjectMembership.objects.get_or_create(
            project=project,
            user=self.request.user,
            defaults={"role": ProjectMembership.Role.OWNER}
        )
        
        # 3. Handle "Assigned To" users from the frontend
        # Assuming your frontend sends a list of IDs in a field called 'assigned_to'
        # (Check your browser network tab to confirm the exact key name)
        assigned_user_ids = self.request.data.get('assigned_to', []) 
        
        if assigned_user_ids:
            # Loop through IDs and create Member entries
            for user_id in assigned_user_ids:
                # Skip the creator (already added above)
                if str(user_id) != str(self.request.user.id):
                    ProjectMembership.objects.get_or_create(
                        project=project,
                        user_id=user_id,
                        defaults={"role": ProjectMembership.Role.MEMBER}
                    )

        log_action(project, "create", new_value=serializer.data)
    
    def perform_update(self, serializer):
        old_data = ProjectSerializer(self.get_object()).data
        project = serializer.save(updated_by=self.request.user)
        log_action(project, "update", old_value=old_data, new_value=serializer.data)
    
    def perform_destroy(self, instance):
        log_action(instance, "delete", old_value=ProjectSerializer(instance).data)
        instance.delete()
    @action(detail=True, methods=["post"], url_path="get-upload-url")
    def get_upload_url(self, request, pk=None):
        """
        Generates a Presigned Post URL.
        """
        project = self.get_object()
        
        file_name = request.data.get("file_name")
        file_type = request.data.get("file_type")
        
        if not file_name or not file_type:
            return Response(
                {"detail": "file_name and file_type are required."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # 1. Define the specific path where this file will live
        s3_key = f"projects/{project.id}/documents/{file_name}"

        # 2. Initialize the S3 client using credentials from settings.py
        s3_client = boto3.client(
            "s3",
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION_NAME,
        )

        try:
            # 3. Generate the secure URL (The "Permission Slip")
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

        # 4. Return URL to frontend
        return Response({
            "url": presigned_data["url"],
            "fields": presigned_data["fields"],
            "file_key": s3_key
        })
    @action(detail=True, methods=["get"])
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
    
    @action(detail=True, methods=["get"])
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
    
    @action(detail=True, methods=["post"])
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
    
    @action(detail=True, methods=["delete"], url_path="members/(?P<user_id>[^/.]+)")
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
            return Project.objects.all()  # Admins see everything
        
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
