from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.shortcuts import get_object_or_404
from django.db.models import Count, Q

# Ensure this import matches your project structure
from apps.users.models import User
from .models import Task
from .serializers import TaskSerializer, TaskStatusUpdateSerializer, UserManagementSerializer

class AllUsersListView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_manager:
             return Response(
                {"detail": "You do not have permission to view users."},
                status=status.HTTP_403_FORBIDDEN
            )

        users = User.objects.all().order_by('username')
        serializer = UserManagementSerializer(users, many=True)
        return Response({
            "message": "All users retrieved successfully",
            "users": serializer.data
        }, status=status.HTTP_200_OK)

class TaskListCreateView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
<<<<<<< HEAD
        if request.user.is_manager:
=======
        # --- UPDATE THIS CONDITION ---
        # Allow if Manager OR Superuser (Admin)
        if request.user.is_manager or request.user.is_superuser:
>>>>>>> origin/harshitlens
            tasks = Task.objects.all()
        else:
            tasks = Task.objects.filter(assigned_to=request.user).distinct()
        
<<<<<<< HEAD
=======
        # (Include your project filtering logic here from the previous step)
        project_id = request.query_params.get('project_id')
        if project_id:
            tasks = tasks.filter(project__id=project_id)

>>>>>>> origin/harshitlens
        serializer = TaskSerializer(tasks, many=True)
        return Response({
            "message": "Tasks retrieved successfully",
            "tasks": serializer.data
        }, status=status.HTTP_200_OK)

    def post(self, request):
<<<<<<< HEAD
        if not request.user.is_manager:
=======
        # --- UPDATE THIS CONDITION ---
        # Allow Admin to create tasks too
        if not (request.user.is_manager or request.user.is_superuser):
>>>>>>> origin/harshitlens
            return Response(
                {"detail": "You do not have permission to create tasks."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = TaskSerializer(data=request.data)
        if serializer.is_valid():
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
        task = get_object_or_404(Task, id=task_id)

<<<<<<< HEAD
        if not request.user.is_manager and not task.assigned_to.filter(id=request.user.id).exists():
=======
        # --- UPDATE THIS CONDITION ---
        # Allow if Manager OR Superuser OR if assigned to the user
        is_authorized = (
            request.user.is_manager or 
            request.user.is_superuser or 
            task.assigned_to.filter(id=request.user.id).exists()
        )

        if not is_authorized:
>>>>>>> origin/harshitlens
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
        task = get_object_or_404(Task, id=task_id)

        if request.user.is_manager:
            serializer = TaskSerializer(task, data=request.data, partial=True)
        else:
            if not task.assigned_to.filter(id=request.user.id).exists():
                return Response(
                    {"detail": "You do not have permission to update this task."},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Allow status updates
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
        task = get_object_or_404(Task, id=task_id)

        if not request.user.is_manager:
             return Response(
                {"detail": "You do not have permission to delete tasks."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        task.delete()
        return Response({
            "message": "Task deleted successfully"
        }, status=status.HTTP_204_NO_CONTENT)
<<<<<<< HEAD
=======
    def delete(self, request, task_id): 
        # 1. Get the task or return 404 if not found
        task = get_object_or_404(Task, id=task_id)

        # 2. Permission Check: Allow if user is a Manager OR an Admin (superuser)
        if not (request.user.is_manager or request.user.is_superuser):
             return Response(
                {"detail": "You do not have permission to delete tasks."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # 3. Delete the task
        task.delete()
        
        # 4. Return success response (204 No Content is standard for deletes)
        return Response({
            "message": "Task deleted successfully"
        }, status=status.HTTP_204_NO_CONTENT)
>>>>>>> origin/harshitlens

# --- CORRECTED PERFORMANCE VIEW ---
class UserPerformanceView(APIView):
    """
    GET: Retrieve detailed performance metrics for a specific user.
    Only accessible by Admins and Managers.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, user_id):
        # 1. Permission Check
        if not request.user.is_manager:
            return Response(
                {"detail": "You do not have permission to view team performance."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # 2. Get the target user
        target_user = get_object_or_404(User, id=user_id)
        
        # 3. Get all tasks assigned to this user
        user_tasks = Task.objects.filter(assigned_to=target_user)
        
        # 4. Calculate Metrics
        total_tasks = user_tasks.count()
        
        # FIX: Used '__iexact' to match status regardless of case (pending vs PENDING)
        metrics = {
            "total": total_tasks,
            "pending": user_tasks.filter(status__iexact='pending').count(),
            "in_progress": user_tasks.filter(status__iexact='in_progress').count(),
            "completed": user_tasks.filter(status__iexact='completed').count(),
            "deployed": user_tasks.filter(status__iexact='deployed').count(),
            "deferred": user_tasks.filter(status__iexact='deferred').count(),
        }
        
        # 5. Serialize the task list for detailed history
        task_serializer = TaskSerializer(user_tasks, many=True)
        user_serializer = UserManagementSerializer(target_user)

        return Response({
            "user": user_serializer.data,
            "performance_metrics": metrics,
            "task_history": task_serializer.data
<<<<<<< HEAD
        }, status=status.HTTP_200_OK)
=======
        }, status=status.HTTP_200_OK)
    
>>>>>>> origin/harshitlens
