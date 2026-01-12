# serializers.py
import os
import boto3
from django.conf import settings
from rest_framework import serializers
from .models import Task, TaskAttachment, TaskComment
from apps.users.models import User
# Import your existing Project model here too
from apps.projects.models import Project 

class AssignedByUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'role']
        read_only_fields = fields

class UserManagementSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role']

# Optional: A simple serializer to show project details in the response
class ProjectSimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ['id', 'name']

class TaskAttachmentSerializer(serializers.ModelSerializer):
    file_name = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField() # <--- NEW: The working link

    class Meta:
        model = TaskAttachment
        fields = ['id', 'file', 'file_name', 'file_url', 'uploaded_at']
        
        # OPTIONAL: Hide the broken 'file' path from the output so you don't use it by mistake
        extra_kwargs = {
            'file': {'write_only': True} 
        }

    def get_file_name(self, obj):
        return os.path.basename(obj.file.name)

    def get_file_url(self, obj):
        """
        Generates a temporary public link (Presigned URL) for the private S3 file.
        """
        if not obj.file:
            return None

        # 1. Initialize S3 Client using your Django Settings
        s3_client = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION_NAME
        )

        # 2. Generate the URL (Valid for 1 hour / 3600 seconds)
        try:
            url = s3_client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': settings.AWS_STORAGE_BUCKET_NAME,
                    'Key': obj.file.name
                },
                ExpiresIn=3600 
            )
            return url
        except Exception as e:
            print(f"Error generating presigned URL: {e}")
            return None
class UserSimpleSerializer(serializers.ModelSerializer):
    """Helper to show user details inside a comment"""
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email']

class TaskCommentSerializer(serializers.ModelSerializer):
    user_details = UserSimpleSerializer(source='user', read_only=True)

    class Meta:
        model = TaskComment
        fields = ['id', 'task', 'user', 'user_details', 'content', 'created_at']
        read_only_fields = ['id', 'created_at', 'user', 'task']

class TaskSerializer(serializers.ModelSerializer):
    assigned_to_user_details = AssignedByUserSerializer(source='assigned_to', read_only=True, many=True)
    assigned_by_user_details = AssignedByUserSerializer(source='assigned_by', read_only=True)
    
    # --- ADD THIS TO HANDLE PROJECT ID ---
    # This allows you to send "project": 9 in the POST request
    project = serializers.PrimaryKeyRelatedField(
        queryset=Project.objects.all(),
        required=False,
        allow_null=True
    )
    # This shows the project name when you GET the task
    project_details = ProjectSimpleSerializer(source='project', read_only=True)

    attachments = TaskAttachmentSerializer(many=True, read_only=True)
    comments = TaskCommentSerializer(many=True, read_only=True)
    # WRITE ONLY: This allows uploading multiple files during creation
    uploaded_files = serializers.ListField(
        child=serializers.FileField(),
        write_only=True,
        required=False
    )
    # -------------------------------------

    class Meta:
        model = Task
        fields = [
            'id', 'heading', 'description', 'start_date', 'end_date',
            'duration_time',
            'priority',
            'project',          # <--- Send ID (9) here when creating
            'project_details',  # <--- Receive details (Name: Marketing...) here when viewing
            'assigned_to', 
            'assigned_to_user_details', 
            'assigned_by',
            'assigned_by_user_details',
            'status',
            'attachments',    # <--- Include in output
            'uploaded_files',
            'created_at',
            'updated_at',
            'comments'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'assigned_by', 'assigned_by_user_details']

    def create(self, validated_data):
        # 1. Pop the files out of the data so they don't break the Task creation
        uploaded_files = validated_data.pop('uploaded_files', [])
        
        # 2. Create the Task normally
        task = super().create(validated_data)
        
        # 3. Create the Attachment objects linking them to the new Task
        for file in uploaded_files:
            TaskAttachment.objects.create(task=task, file=file)
            
        return task

    def update(self, instance, validated_data):
        validated_data.pop('assigned_by', None)
        return super().update(instance, validated_data)

class TaskStatusUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = ['id', 'status']
        read_only_fields = ['id']
