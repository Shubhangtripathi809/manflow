"""
Views for Users app.
"""
from django.contrib.auth import get_user_model
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from django.shortcuts import get_object_or_404
from .serializers import UserRoleUpdateSerializer
from .serializers import UserCreateSerializer, UserSerializer

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    """
    Register a new user.
    """
    queryset = User.objects.all()
    serializer_class = UserCreateSerializer
    permission_classes = [permissions.AllowAny]

class UserCreateView(generics.CreateAPIView):
    """
    Admin-only view to create new users/employees.
    Only users with is_staff/is_superuser can access this.
    """
    queryset = User.objects.all()
    serializer_class = UserCreateSerializer
    # Change permission from AllowAny to IsAdminUser
    permission_classes = [permissions.IsAdminUser]

class MeView(APIView):
    """
    Get current user profile.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)
    
    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class UserListView(generics.ListAPIView):
    """
    List all users (for assignments, etc.)
    """
    queryset = User.objects.filter(is_active=True)
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    search_fields = ["username", "email", "first_name", "last_name"]

class ChangeUserRoleView(APIView):
    """
    Endpoint to change a user's role.
    Only accessible by Admins and Managers.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def patch(self, request, user_id):
        # 1. Permission Check: Only Admins/Managers can change roles
        if not request.user.is_manager:
            return Response(
                {"detail": "You do not have permission to change user roles."},
                status=status.HTTP_403_FORBIDDEN
            )

        # 2. Get the user to be updated
        target_user = get_object_or_404(User, id=user_id)

        # 3. Serialize and Save
        serializer = UserRoleUpdateSerializer(target_user, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            return Response({
                "message": f"Role for {target_user.username} updated to {serializer.data['role']}",
                "user": serializer.data
            }, status=status.HTTP_200_OK)
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)