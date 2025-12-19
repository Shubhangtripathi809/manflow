from rest_framework import serializers
from .models import Task
from apps.users.models import User
from apps.projects.models import Project


class AssignedByUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "email", "role"]
        read_only_fields = fields


class UserManagementSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", "role"]


# Simple serializer to show project details in task response
class ProjectSimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ["id", "name"]


class TaskSerializer(serializers.ModelSerializer):
    assigned_to_user_details = AssignedByUserSerializer(
        source="assigned_to",
        many=True,
        read_only=True,
    )
    assigned_by_user_details = AssignedByUserSerializer(
        source="assigned_by",
        read_only=True,
    )

    # ✅ Accept project ID on create/update
    project = serializers.PrimaryKeyRelatedField(
        queryset=Project.objects.all(),
        required=False,
        allow_null=True,
    )

    # ✅ Show project details on GET
    project_details = ProjectSimpleSerializer(
        source="project",
        read_only=True,
    )

    class Meta:
        model = Task
        fields = [
            "id",
            "heading",
            "description",
            "start_date",
            "end_date",
            "priority",
            "project",          # send project ID
            "project_details",  # receive project info
            "assigned_to",
            "assigned_to_user_details",
            "assigned_by",
            "assigned_by_user_details",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "assigned_by",
            "assigned_by_user_details",
        ]

    def create(self, validated_data):
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop("assigned_by", None)
        return super().update(instance, validated_data)


class TaskStatusUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = ["id", "status"]
        read_only_fields = ["id"]
