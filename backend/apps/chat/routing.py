"""
WebSocket URL routing for chat application.

Routes:
- /ws/chat/<room_slug>/ - Main chat WebSocket
- /ws/notifications/ - User notification WebSocket
- /ws/presence/ - Online status tracking
"""
from django.urls import path, re_path

from .consumers import ChatConsumer, NotificationConsumer, OnlineStatusConsumer

websocket_urlpatterns = [
    # Main chat room connection
    # Accepts room slug as URL parameter
    # Example: ws://localhost:8000/ws/chat/global-chat/
    path(
        'ws/chat/<str:room_slug>/',
        ChatConsumer.as_asgi(),
        name='ws_chat'
    ),
    
    # User-specific notifications
    # Each user connects to receive real-time notification updates
    # Example: ws://localhost:8000/ws/notifications/
    path(
        'ws/notifications/',
        NotificationConsumer.as_asgi(),
        name='ws_notifications'
    ),
    
    # Online presence tracking
    # Broadcasts online/offline status to all connected users
    # Example: ws://localhost:8000/ws/presence/
    path(
        'ws/presence/',
        OnlineStatusConsumer.as_asgi(),
        name='ws_presence'
    ),
]
