# serializers.py
from rest_framework import serializers
from .models import Task
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
    # -------------------------------------

    class Meta:
        model = Task
        fields = [
            'id', 'heading', 'description', 'start_date', 'end_date',
            'priority',
            'project',          # <--- Send ID (9) here when creating
            'project_details',  # <--- Receive details (Name: Marketing...) here when viewing
            'assigned_to', 
            'assigned_to_user_details', 
            'assigned_by',
            'assigned_by_user_details',
            'status', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'assigned_by', 'assigned_by_user_details']

    def create(self, validated_data):
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop('assigned_by', None)
        return super().update(instance, validated_data)

class TaskStatusUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = ['id', 'status']
        read_only_fields = ['id']