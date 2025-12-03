from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.shortcuts import get_object_or_404

from apps.users.models import User # CORRECTION: Imported from users.models
from .models import Task
from .serializers import TaskSerializer, TaskStatusUpdateSerializer, UserManagementSerializer

class AllUsersListView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        GET: Retrieve a list of all users.
        Only accessible by Admin or Manager.
        """
        # Updated to allow Managers to see the user list to assign tasks
        if not request.user.is_manager:
             return Response(
                {"detail": "You do not have permission to view users."},
                status=status.HTTP_403_FORBIDDEN
            )

        users = User.objects.all().order_by('username') # CORRECTION: Changed CustomUser to User
        serializer = UserManagementSerializer(users, many=True)
        return Response({
            "message": "All users retrieved successfully",
            "users": serializer.data
        }, status=status.HTTP_200_OK)

class TaskListCreateView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        GET: List tasks.
        Admins/Managers see ALL tasks. 
        Annotators/Viewers see only tasks assigned to them.
        """
        # Use the 'is_manager' property from your User model
        if request.user.is_manager:
            tasks = Task.objects.all()
        else:
            tasks = Task.objects.filter(assigned_to=request.user).distinct()
        
        serializer = TaskSerializer(tasks, many=True)
        return Response({
            "message": "Tasks retrieved successfully",
            "tasks": serializer.data
        }, status=status.HTTP_200_OK)

    def post(self, request):
        """
        POST: Create a new task. 
        Only accessible by Admins and Managers.
        """
        # Permission Check
        if not request.user.is_manager:
            return Response(
                {"detail": "You do not have permission to create tasks."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = TaskSerializer(data=request.data)
        if serializer.is_valid():
            # Automatically assign the creator (Admin or Manager)
            serializer.save(assigned_by=request.user)
            return Response({
                "message": "Task created successfully",
                "task": serializer.data
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TaskRetrieveUpdateView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, task_id):
        """
        GET: Retrieve a single task by ID.
        """
        task = get_object_or_404(Task, id=task_id)

        # Allow if user is Manager OR if the task is assigned to the user
        if not request.user.is_manager and not task.assigned_to.filter(id=request.user.id).exists():
            return Response(
                {"detail": "You do not have permission to view this task."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = TaskSerializer(task)
        return Response({
            "message": "Task retrieved successfully",
            "task": serializer.data
        }, status=status.HTTP_200_OK)

    def patch(self, request, task_id):
        """
        PATCH: Update a task.
        Admins/Managers: Can update ANY field.
        Annotators/Viewers: Can ONLY update 'status' of assigned tasks.
        """
        task = get_object_or_404(Task, id=task_id)

        if request.user.is_manager:
            # Managers/Admins use the full serializer (can update anything)
            serializer = TaskSerializer(task, data=request.data, partial=True)
        else:
            # Regular users must be assigned to the task
            if not task.assigned_to.filter(id=request.user.id).exists():
                return Response(
                    {"detail": "You do not have permission to update this task."},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Restrict updates to 'status' only
            if len(request.data) > 1 or ('status' in request.data and len(request.data) == 1):
                pass
            else:
                return Response(
                    {"detail": "You can only update the 'status' field."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            serializer = TaskStatusUpdateSerializer(task, data=request.data, partial=True)

        if serializer.is_valid():
            serializer.save()
            return Response({
                "message": "Task updated successfully",
                "task": serializer.data
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, task_id): 
        """
        DELETE: Delete a task by ID.
        Only Admins and Managers can delete tasks.
        """
        task = get_object_or_404(Task, id=task_id)

        # Only Managers/Admins can delete
        if not request.user.is_manager:
             return Response(
                {"detail": "You do not have permission to delete tasks."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        task.delete()
        return Response({
            "message": "Task deleted successfully"
        }, status=status.HTTP_204_NO_CONTENT)