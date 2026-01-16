"""
Views for Notifications app.
API endpoints for fetching and managing notifications.
"""
from django.db.models import Count
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

# Import your custom authentication if needed
from apps.users.auth import StaticTokenAuthentication

from .models import Notification, NotificationPreference
from .serializers import (
    NotificationSerializer,
    NotificationListSerializer,
    MarkAsReadSerializer,
    NotificationPreferenceSerializer,
    NotificationCountSerializer,
)
from .services import get_or_create_preferences, mark_all_as_read, get_unread_count


class NotificationListView(APIView):
    """
    GET: List all notifications for the authenticated user.
    
    Query Parameters:
        - is_read: Filter by read status (true/false)
        - notification_type: Filter by type (e.g., task_assigned, task_status_updated)
        - priority: Filter by priority (low, medium, high, urgent)
        - limit: Limit number of results (default: 50)
        - offset: Offset for pagination (default: 0)
    """
    authentication_classes = [StaticTokenAuthentication, JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        queryset = Notification.objects.filter(recipient=user).select_related('actor')
        
        # Filter by read status
        is_read = request.query_params.get('is_read')
        if is_read is not None:
            is_read_bool = is_read.lower() in ('true', '1', 'yes')
            queryset = queryset.filter(is_read=is_read_bool)
        
        # Filter by notification type
        notification_type = request.query_params.get('notification_type')
        if notification_type:
            queryset = queryset.filter(notification_type=notification_type)
        
        # Filter by priority
        priority = request.query_params.get('priority')
        if priority:
            queryset = queryset.filter(priority=priority)
        
        # Pagination
        limit = int(request.query_params.get('limit', 50))
        offset = int(request.query_params.get('offset', 0))
        
        total_count = queryset.count()
        notifications = queryset[offset:offset + limit]
        
        serializer = NotificationListSerializer(notifications, many=True)
        
        return Response({
            'message': 'Notifications retrieved successfully',
            'total': total_count,
            'unread_count': queryset.filter(is_read=False).count(),
            'limit': limit,
            'offset': offset,
            'notifications': serializer.data
        }, status=status.HTTP_200_OK)


class NotificationDetailView(APIView):
    """
    GET: Retrieve a single notification.
    DELETE: Delete a notification.
    """
    authentication_classes = [StaticTokenAuthentication, JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request, notification_id):
        notification = get_object_or_404(
            Notification,
            id=notification_id,
            recipient=request.user
        )
        
        serializer = NotificationSerializer(notification)
        return Response({
            'message': 'Notification retrieved successfully',
            'notification': serializer.data
        }, status=status.HTTP_200_OK)
    
    def delete(self, request, notification_id):
        notification = get_object_or_404(
            Notification,
            id=notification_id,
            recipient=request.user
        )
        
        notification.delete()
        return Response({
            'message': 'Notification deleted successfully'
        }, status=status.HTTP_204_NO_CONTENT)


class NotificationMarkReadView(APIView):
    """
    POST: Mark notification(s) as read.
    
    Request Body (optional):
        - notification_ids: List of notification IDs to mark as read
        
    If notification_ids is not provided, marks all notifications as read.
    """
    authentication_classes = [StaticTokenAuthentication, JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def post(self, request, notification_id=None):
        user = request.user
        
        # If notification_id is provided in URL, mark that specific one
        if notification_id:
            notification = get_object_or_404(
                Notification,
                id=notification_id,
                recipient=user
            )
            notification.mark_as_read()
            
            return Response({
                'message': 'Notification marked as read',
                'notification_id': notification_id
            }, status=status.HTTP_200_OK)
        
        # Otherwise, check request body for IDs
        serializer = MarkAsReadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        notification_ids = serializer.validated_data.get('notification_ids', [])
        
        if notification_ids:
            # Mark specific notifications as read
            updated_count = Notification.objects.filter(
                id__in=notification_ids,
                recipient=user,
                is_read=False
            ).update(
                is_read=True,
                read_at=timezone.now()
            )
            
            return Response({
                'message': f'{updated_count} notification(s) marked as read',
                'marked_count': updated_count
            }, status=status.HTTP_200_OK)
        else:
            # Mark all as read
            updated_count = mark_all_as_read(user)
            
            return Response({
                'message': 'All notifications marked as read',
                'marked_count': updated_count
            }, status=status.HTTP_200_OK)


class NotificationMarkUnreadView(APIView):
    """
    POST: Mark a notification as unread.
    """
    authentication_classes = [StaticTokenAuthentication, JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def post(self, request, notification_id):
        notification = get_object_or_404(
            Notification,
            id=notification_id,
            recipient=request.user
        )
        
        notification.mark_as_unread()
        
        return Response({
            'message': 'Notification marked as unread',
            'notification_id': notification_id
        }, status=status.HTTP_200_OK)


class NotificationUnreadCountView(APIView):
    """
    GET: Get count of unread notifications.
    """
    authentication_classes = [StaticTokenAuthentication, JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        unread_count = get_unread_count(request.user)
        
        return Response({
            'unread_count': unread_count
        }, status=status.HTTP_200_OK)


class NotificationCountView(APIView):
    """
    GET: Get detailed notification counts (total, unread, by type).
    """
    authentication_classes = [StaticTokenAuthentication, JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        queryset = Notification.objects.filter(recipient=user)
        
        total = queryset.count()
        unread = queryset.filter(is_read=False).count()
        
        # Count by notification type
        by_type = {}
        type_counts = queryset.values('notification_type').annotate(count=Count('id'))
        for item in type_counts:
            by_type[item['notification_type']] = item['count']
        
        data = {
            'total': total,
            'unread': unread,
            'by_type': by_type
        }
        
        serializer = NotificationCountSerializer(data)
        return Response(serializer.data, status=status.HTTP_200_OK)


class NotificationDeleteAllReadView(APIView):
    """
    DELETE: Delete all read notifications for the user.
    """
    authentication_classes = [StaticTokenAuthentication, JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def delete(self, request):
        deleted_count, _ = Notification.objects.filter(
            recipient=request.user,
            is_read=True
        ).delete()
        
        return Response({
            'message': f'{deleted_count} read notification(s) deleted',
            'deleted_count': deleted_count
        }, status=status.HTTP_200_OK)


class NotificationPreferencesView(APIView):
    """
    GET: Retrieve user's notification preferences.
    PUT/PATCH: Update user's notification preferences.
    """
    authentication_classes = [StaticTokenAuthentication, JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        preferences = get_or_create_preferences(request.user)
        serializer = NotificationPreferenceSerializer(preferences)
        
        return Response({
            'message': 'Preferences retrieved successfully',
            'preferences': serializer.data
        }, status=status.HTTP_200_OK)
    
    def put(self, request):
        preferences = get_or_create_preferences(request.user)
        serializer = NotificationPreferenceSerializer(
            preferences,
            data=request.data
        )
        
        if serializer.is_valid():
            serializer.save()
            return Response({
                'message': 'Preferences updated successfully',
                'preferences': serializer.data
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def patch(self, request):
        preferences = get_or_create_preferences(request.user)
        serializer = NotificationPreferenceSerializer(
            preferences,
            data=request.data,
            partial=True
        )
        
        if serializer.is_valid():
            serializer.save()
            return Response({
                'message': 'Preferences updated successfully',
                'preferences': serializer.data
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UnreadNotificationsView(APIView):
    """
    GET: List only unread notifications.
    Convenience endpoint for quickly fetching unread notifications.
    """
    authentication_classes = [StaticTokenAuthentication, JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        limit = int(request.query_params.get('limit', 20))
        
        notifications = Notification.objects.filter(
            recipient=request.user,
            is_read=False
        ).select_related('actor')[:limit]
        
        serializer = NotificationListSerializer(notifications, many=True)
        
        return Response({
            'message': 'Unread notifications retrieved successfully',
            'count': notifications.count() if hasattr(notifications, 'count') else len(notifications),
            'notifications': serializer.data
        }, status=status.HTTP_200_OK)