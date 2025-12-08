from rest_framework import serializers
from .models import Task
from apps.users.models import User 

class AssignedByUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'role']
        read_only_fields = fields

class UserManagementSerializer(serializers.ModelSerializer):
    """
    Serializer used in AllUsersListView
    """
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role']

class TaskSerializer(serializers.ModelSerializer):
    assigned_to_user_details = AssignedByUserSerializer(source='assigned_to', read_only=True, many=True)
    assigned_by_user_details = AssignedByUserSerializer(source='assigned_by', read_only=True)

    class Meta:
        model = Task
        fields = [
            'id', 'heading', 'description', 'start_date', 'end_date',
            'priority',      # <--- Add this
            'project_name',  # <--- Add this
            'assigned_to', 
            'assigned_to_user_details', 
            'assigned_by',
            'assigned_by_user_details',
            'status', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'assigned_by', 'assigned_by_user_details']

    # def validate_assigned_to(self, value):
    #     for user in value:
    #         if user.role not in ['annotator', 'viewer']:
    #             raise serializers.ValidationError(
    #                 f"User '{user.username}' cannot be assigned a task. Role must be Annotator or Viewer."
    #             )
    #     return value

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