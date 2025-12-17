from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.shortcuts import get_object_or_404

from apps.users.models import User
from .models import Task
from .serializers import (
    TaskSerializer,
    TaskStatusUpdateSerializer,
    UserManagementSerializer,
)


class AllUsersListView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_manager:
            return Response(
                {"detail": "You do not have permission to view users."},
                status=status.HTTP_403_FORBIDDEN,
            )

        users = User.objects.all().order_by("username")
        serializer = UserManagementSerializer(users, many=True)
        return Response(
            {
                "message": "All users retrieved successfully",
                "users": serializer.data,
            },
            status=status.HTTP_200_OK,
        )


class TaskListCreateView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Manager or Admin can see all tasks
        if request.user.is_manager or request.user.is_superuser:
            tasks = Task.objects.all()
        else:
            tasks = Task.objects.filter(assigned_to=request.user).distinct()

        # Optional project filter
        project_id = request.query_params.get("project_id")
        if project_id:
            tasks = tasks.filter(project__id=project_id)

        serializer = TaskSerializer(tasks, many=True)
        return Response(
            {
                "message": "Tasks retrieved successfully",
                "tasks": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        # Manager or Admin can create tasks
        if not (request.user.is_manager or request.user.is_superuser):
            return Response(
                {"detail": "You do not have permission to create tasks."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = TaskSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(assigned_by=request.user)
            return Response(
                {
                    "message": "Task created successfully",
                    "task": serializer.data,
                },
                status=status.HTTP_201_CREATED,
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TaskRetrieveUpdateView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, task_id):
        task = get_object_or_404(Task, id=task_id)

        is_authorized = (
            request.user.is_manager
            or request.user.is_superuser
            or task.assigned_to.filter(id=request.user.id).exists()
        )

        if not is_authorized:
            return Response(
                {"detail": "You do not have permission to view this task."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = TaskSerializer(task)
        return Response(
            {
                "message": "Task retrieved successfully",
                "task": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    def patch(self, request, task_id):
        task = get_object_or_404(Task, id=task_id)

        # Manager/Admin → full update
        if request.user.is_manager or request.user.is_superuser:
            serializer = TaskSerializer(task, data=request.data, partial=True)
        else:
            # Assigned user → status only
            if not task.assigned_to.filter(id=request.user.id).exists():
                return Response(
                    {"detail": "You do not have permission to update this task."},
                    status=status.HTTP_403_FORBIDDEN,
                )

            if set(request.data.keys()) != {"status"}:
                return Response(
                    {"detail": "You can only update the 'status' field."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            serializer = TaskStatusUpdateSerializer(
                task, data=request.data, partial=True
            )

        if serializer.is_valid():
            serializer.save()
            return Response(
                {
                    "message": "Task updated successfully",
                    "task": serializer.data,
                },
                status=status.HTTP_200_OK,
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, task_id):
        task = get_object_or_404(Task, id=task_id)

        # Manager or Admin can delete
        if not (request.user.is_manager or request.user.is_superuser):
            return Response(
                {"detail": "You do not have permission to delete tasks."},
                status=status.HTTP_403_FORBIDDEN,
            )

        task.delete()
        return Response(
            {"message": "Task deleted successfully"},
            status=status.HTTP_204_NO_CONTENT,
        )


class UserPerformanceView(APIView):
    """
    GET: Retrieve detailed performance metrics for a specific user.
    Only accessible by Managers.
    """

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, user_id):
        if not request.user.is_manager:
            return Response(
                {"detail": "You do not have permission to view team performance."},
                status=status.HTTP_403_FORBIDDEN,
            )

        target_user = get_object_or_404(User, id=user_id)
        user_tasks = Task.objects.filter(assigned_to=target_user)

        metrics = {
            "total": user_tasks.count(),
            "pending": user_tasks.filter(status__iexact="pending").count(),
            "in_progress": user_tasks.filter(status__iexact="in_progress").count(),
            "completed": user_tasks.filter(status__iexact="completed").count(),
            "deployed": user_tasks.filter(status__iexact="deployed").count(),
            "deferred": user_tasks.filter(status__iexact="deferred").count(),
        }

        task_serializer = TaskSerializer(user_tasks, many=True)
        user_serializer = UserManagementSerializer(target_user)

        return Response(
            {
                "user": user_serializer.data,
                "performance_metrics": metrics,
                "task_history": task_serializer.data,
            },
            status=status.HTTP_200_OK,
        )
