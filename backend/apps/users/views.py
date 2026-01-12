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
from .serializers import UserCreateSerializer, UserSerializer, VerifyOTPSerializer, ForgotPasswordSerializer, SetNewPasswordSerializer, AuthenticatedResetPasswordSerializer
import random
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from .models import PasswordResetOTP
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
class ForgotPasswordView(APIView):
    """Step 1: Send OTP to Email"""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']
        
        user = User.objects.filter(email=email).first()
        if user:
            # Generate 4-digit OTP
            otp = str(random.randint(1000, 9999))
            expiry = timezone.now() + timedelta(minutes=10)
            
            # Delete old OTPs for this user and save new one
            PasswordResetOTP.objects.filter(user=user).delete()
            PasswordResetOTP.objects.create(
                user=user,
                otp_hash=PasswordResetOTP.hash_otp(otp),
                expires_at=expiry
            )

            # Send Email
            send_mail(
                'Your Password Reset OTP',
                f'Your OTP is {otp}. It expires in 10 minutes.',
                settings.DEFAULT_FROM_EMAIL,
                [email],
                fail_silently=False,
            )

        # Return 200 regardless of user existence for security (prevent email enumeration)
        return Response({"detail": "If this email is registered, an OTP has been sent."}, status=status.HTTP_200_OK)

class VerifyOTPView(APIView):
    """Step 2: Check if OTP is valid"""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data['email']
        otp = serializer.validated_data['otp']
        hashed_otp = PasswordResetOTP.hash_otp(otp)

        otp_record = PasswordResetOTP.objects.filter(
            user__email=email, 
            otp_hash=hashed_otp
        ).first()

        if not otp_record or otp_record.is_expired():
            return Response({"detail": "Invalid or expired OTP."}, status=status.HTTP_400_BAD_REQUEST)

        otp_record.is_verified = True
        otp_record.save()
        return Response({"detail": "OTP verified. Proceed to reset password."}, status=status.HTTP_200_OK)

class SetNewPasswordView(APIView):
    """Step 3: Update password using verified OTP"""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = SetNewPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email']
        otp = serializer.validated_data['otp']
        hashed_otp = PasswordResetOTP.hash_otp(otp)

        otp_record = PasswordResetOTP.objects.filter(
            user__email=email, 
            otp_hash=hashed_otp,
            is_verified=True
        ).first()

        if not otp_record or otp_record.is_expired():
            return Response({"detail": "Session expired or OTP not verified."}, status=status.HTTP_400_BAD_REQUEST)

        user = otp_record.user
        user.set_password(serializer.validated_data['password'])
        user.save()
        
        # Burn the OTP record
        otp_record.delete()
        
        return Response({"detail": "Password has been reset successfully."}, status=status.HTTP_200_OK)

class AuthenticatedResetPasswordView(APIView):
    """Reset password for logged-in users"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = AuthenticatedResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = request.user
        if not user.check_password(serializer.validated_data['old_password']):
            return Response({"old_password": ["Wrong password."]}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(serializer.validated_data['new_password'])
        user.save()
        return Response({"detail": "Password updated successfully."}, status=status.HTTP_200_OK)