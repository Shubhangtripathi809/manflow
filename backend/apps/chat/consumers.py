"""
WebSocket consumers for real-time chat.

Handles:
- Connection authentication
- Room joining/leaving
- Message broadcasting
- Typing indicators
- Read receipts
"""
import json
import logging
from typing import Optional, Dict, Any
from uuid import UUID

from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.core.exceptions import PermissionDenied

from .models import ChatRoom, ChatMessage, ChatRoomMembership
from .services import ChatRoomService, ChatMessageService, ChatPermissionService

logger = logging.getLogger(__name__)
User = get_user_model()


class ChatConsumer(AsyncWebsocketConsumer):
    """
    Main WebSocket consumer for chat functionality.
    
    Supports multiple room types:
    - Global chat: All authenticated users
    - Project chat: Project team members
    - Private chat: One-to-one messaging
    
    Message types:
    - chat_message: Regular chat message
    - typing: Typing indicator
    - read: Read receipt
    - user_joined: User joined room
    - user_left: User left room
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.room_slug: Optional[str] = None
        self.room_group_name: Optional[str] = None
        self.room: Optional[ChatRoom] = None
        self.user = None

    async def connect(self):
        """
        Handle WebSocket connection.
        
        1. Authenticate user via JWT middleware
        2. Validate room access
        3. Join channel layer group
        4. Accept connection
        """
        # Get user from scope (set by JWTAuthMiddleware)
        self.user = self.scope.get('user')
        
        # Require authentication
        if not self.user or not self.user.is_authenticated:
            logger.warning("WebSocket connection rejected: Not authenticated")
            await self.close(code=4001)  # Custom close code for auth failure
            return
        
        # Get room slug from URL route
        self.room_slug = self.scope['url_route']['kwargs'].get('room_slug')
        
        if not self.room_slug:
            logger.warning("WebSocket connection rejected: No room slug provided")
            await self.close(code=4002)
            return
        
        # Get room and check access
        self.room = await self.get_room()
        
        if not self.room:
            logger.warning(f"WebSocket connection rejected: Room not found - {self.room_slug}")
            await self.close(code=4003)
            return
        
        # Check room access permission
        has_access = await self.check_access()
        if not has_access:
            logger.warning(f"WebSocket connection rejected: Access denied for user {self.user.id}")
            await self.close(code=4004)
            return
        
        # Set channel group name
        self.room_group_name = self.room.channel_group_name
        
        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        # Accept the WebSocket connection
        await self.accept()
        
        logger.info(f"User {self.user.username} connected to room {self.room_slug}")
        
        # Broadcast user joined event
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'user_joined',
                'user_id': self.user.id,
                'username': self.user.username,
            }
        )
        
        # Send connection confirmation to client
        await self.send(text_data=json.dumps({
            'type': 'connection_established',
            'room_id': str(self.room.id),
            'room_slug': self.room_slug,
            'room_name': self.room.name,
            'room_type': self.room.room_type,
        }))

    async def disconnect(self, close_code):
        """
        Handle WebSocket disconnection.
        
        1. Leave channel layer group
        2. Broadcast user left event
        """
        if self.room_group_name:
            # Broadcast user left event
            if self.user and self.user.is_authenticated:
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'user_left',
                        'user_id': self.user.id,
                        'username': self.user.username,
                    }
                )
            
            # Leave room group
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
        
        logger.info(f"User disconnected from room {self.room_slug}, code: {close_code}")

    async def receive(self, text_data):
        """
        Handle incoming WebSocket messages.
        
        Routes messages based on type:
        - chat_message: Send new message
        - typing: Broadcast typing indicator
        - read: Mark messages as read
        - delete: Delete message
        """
        try:
            data = json.loads(text_data)
            message_type = data.get('type', 'chat_message')
            
            handlers = {
                'chat_message': self.handle_chat_message,
                'typing': self.handle_typing,
                'read': self.handle_read,
                'delete': self.handle_delete,
            }
            
            handler = handlers.get(message_type)
            if handler:
                await handler(data)
            else:
                await self.send_error(f"Unknown message type: {message_type}")
                
        except json.JSONDecodeError:
            await self.send_error("Invalid JSON format")
        except Exception as e:
            logger.error(f"Error processing WebSocket message: {str(e)}")
            await self.send_error("Internal server error")

    async def handle_chat_message(self, data: Dict[str, Any]):
        """
        Handle incoming chat message.
        
        1. Validate message content
        2. Save to database
        3. Broadcast to room group
        """
        content = data.get('content', '').strip()
        message_type = data.get('message_type', 'text')
        reply_to_id = data.get('reply_to')
        
        if not content and message_type == 'text':
            await self.send_error("Message content is required")
            return
        
        # Check permission
        can_send = await self.check_send_permission()
        if not can_send:
            await self.send_error("You don't have permission to send messages")
            return
        
        # Save message to database
        message = await self.save_message(
            content=content,
            message_type=message_type,
            reply_to_id=reply_to_id
        )
        
        if not message:
            await self.send_error("Failed to save message")
            return
        
        # Broadcast message to room
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message_broadcast',
                'message': message.to_websocket_dict(),
            }
        )

    async def handle_typing(self, data: Dict[str, Any]):
        """
        Handle typing indicator.
        Broadcasts to all other users in room.
        """
        is_typing = data.get('is_typing', True)
        
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'typing_broadcast',
                'user_id': self.user.id,
                'username': self.user.username,
                'is_typing': is_typing,
            }
        )

    async def handle_read(self, data: Dict[str, Any]):
        """
        Handle read receipt.
        Marks messages as read and broadcasts to room.
        """
        message_id = data.get('message_id')
        
        # Mark all messages as read up to this point
        count = await self.mark_messages_read()
        
        # Broadcast read receipt
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'read_receipt_broadcast',
                'user_id': self.user.id,
                'username': self.user.username,
                'message_id': message_id,
                'read_count': count,
            }
        )

    async def handle_delete(self, data: Dict[str, Any]):
        """
        Handle message deletion request.
        """
        message_id = data.get('message_id')
        
        if not message_id:
            await self.send_error("Message ID is required")
            return
        
        success = await self.delete_message(message_id)
        
        if success:
            # Broadcast deletion to room
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'message_deleted_broadcast',
                    'message_id': message_id,
                    'deleted_by': self.user.id,
                }
            )
        else:
            await self.send_error("Failed to delete message or permission denied")

    # ==================== Group Message Handlers ====================
    # These methods handle messages sent to the channel layer group

    async def chat_message_broadcast(self, event):
        """Send chat message to WebSocket."""
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'message': event['message'],
        }))

    async def typing_broadcast(self, event):
        """Send typing indicator to WebSocket."""
        # Don't send typing indicator to the user who is typing
        if event['user_id'] != self.user.id:
            await self.send(text_data=json.dumps({
                'type': 'typing',
                'user_id': event['user_id'],
                'username': event['username'],
                'is_typing': event['is_typing'],
            }))

    async def read_receipt_broadcast(self, event):
        """Send read receipt to WebSocket."""
        await self.send(text_data=json.dumps({
            'type': 'read_receipt',
            'user_id': event['user_id'],
            'username': event['username'],
            'message_id': event.get('message_id'),
        }))

    async def message_deleted_broadcast(self, event):
        """Send message deletion notification to WebSocket."""
        await self.send(text_data=json.dumps({
            'type': 'message_deleted',
            'message_id': event['message_id'],
            'deleted_by': event['deleted_by'],
        }))

    async def user_joined(self, event):
        """Send user joined notification to WebSocket."""
        # Don't notify the user who just joined
        if event['user_id'] != self.user.id:
            await self.send(text_data=json.dumps({
                'type': 'user_joined',
                'user_id': event['user_id'],
                'username': event['username'],
            }))

    async def user_left(self, event):
        """Send user left notification to WebSocket."""
        await self.send(text_data=json.dumps({
            'type': 'user_left',
            'user_id': event['user_id'],
            'username': event['username'],
        }))

    # ==================== Utility Methods ====================

    async def send_error(self, message: str):
        """Send error message to client."""
        await self.send(text_data=json.dumps({
            'type': 'error',
            'message': message,
        }))

    # ==================== Database Operations ====================
    # Using database_sync_to_async for all database operations

    @database_sync_to_async
    def get_room(self) -> Optional[ChatRoom]:
        """Get room by slug from database."""
        try:
            return ChatRoom.objects.select_related('project').get(
                slug=self.room_slug,
                is_active=True
            )
        except ChatRoom.DoesNotExist:
            return None

    @database_sync_to_async
    def check_access(self) -> bool:
        """Check if user has access to room."""
        return ChatRoomService.check_room_access(self.room, self.user)

    @database_sync_to_async
    def check_send_permission(self) -> bool:
        """Check if user can send messages."""
        return ChatPermissionService.can_send_message(self.user, self.room)

    @database_sync_to_async
    def save_message(
        self,
        content: str,
        message_type: str = 'text',
        reply_to_id: Optional[str] = None
    ) -> Optional[ChatMessage]:
        """Save message to database."""
        try:
            reply_to_uuid = UUID(reply_to_id) if reply_to_id else None
            
            return ChatMessageService.create_message(
                room=self.room,
                sender=self.user,
                content=content,
                message_type=message_type,
                reply_to_id=reply_to_uuid
            )
        except Exception as e:
            logger.error(f"Failed to save message: {str(e)}")
            return None

    @database_sync_to_async
    def mark_messages_read(self) -> int:
        """Mark messages in room as read."""
        return ChatMessageService.mark_messages_as_read(self.room, self.user)

    @database_sync_to_async
    def delete_message(self, message_id: str) -> bool:
        """Delete a message."""
        try:
            message = ChatMessage.objects.get(id=message_id, room=self.room)
            return ChatMessageService.delete_message(message, self.user)
        except ChatMessage.DoesNotExist:
            return False


class NotificationConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for user-specific notifications.
    
    Each user connects to their personal notification channel
    to receive real-time updates about new messages across all rooms.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.user = None
        self.notification_group_name: Optional[str] = None

    async def connect(self):
        """
        Handle WebSocket connection for notifications.
        User connects to their personal notification channel.
        """
        self.user = self.scope.get('user')
        
        if not self.user or not self.user.is_authenticated:
            await self.close(code=4001)
            return
        
        # Each user gets their own notification group
        self.notification_group_name = f"notifications_{self.user.id}"
        
        await self.channel_layer.group_add(
            self.notification_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        logger.info(f"User {self.user.username} connected to notifications")

    async def disconnect(self, close_code):
        """Handle WebSocket disconnection."""
        if self.notification_group_name:
            await self.channel_layer.group_discard(
                self.notification_group_name,
                self.channel_name
            )

    async def receive(self, text_data):
        """
        Handle incoming messages (e.g., marking notifications as read).
        """
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'mark_read':
                # Handle marking notification as read
                notification_id = data.get('notification_id')
                await self.mark_notification_read(notification_id)
                
        except json.JSONDecodeError:
            pass

    async def new_message_notification(self, event):
        """Send new message notification to user."""
        await self.send(text_data=json.dumps({
            'type': 'new_message',
            'room_id': event['room_id'],
            'room_name': event['room_name'],
            'sender_username': event['sender_username'],
            'message_preview': event['message_preview'],
        }))

    async def notification_update(self, event):
        """Send general notification update."""
        await self.send(text_data=json.dumps({
            'type': 'notification',
            'data': event['data'],
        }))

    @database_sync_to_async
    def mark_notification_read(self, notification_id):
        """Mark a notification as read."""
        # Integration with notification app
        try:
            from apps.notification.models import Notification
            Notification.objects.filter(
                id=notification_id,
                recipient=self.user
            ).update(is_read=True)
        except Exception as e:
            logger.error(f"Failed to mark notification read: {str(e)}")


class OnlineStatusConsumer(AsyncWebsocketConsumer):
    """
    Consumer for tracking online/offline status.
    Broadcasts user presence to relevant channels.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.user = None
        self.presence_group = "presence"

    async def connect(self):
        """Handle connection and broadcast online status."""
        self.user = self.scope.get('user')
        
        if not self.user or not self.user.is_authenticated:
            await self.close(code=4001)
            return
        
        # Join presence group
        await self.channel_layer.group_add(
            self.presence_group,
            self.channel_name
        )
        
        await self.accept()
        
        # Broadcast online status
        await self.channel_layer.group_send(
            self.presence_group,
            {
                'type': 'user_online',
                'user_id': self.user.id,
                'username': self.user.username,
            }
        )

    async def disconnect(self, close_code):
        """Handle disconnection and broadcast offline status."""
        if self.user and self.user.is_authenticated:
            await self.channel_layer.group_send(
                self.presence_group,
                {
                    'type': 'user_offline',
                    'user_id': self.user.id,
                    'username': self.user.username,
                }
            )
        
        await self.channel_layer.group_discard(
            self.presence_group,
            self.channel_name
        )

    async def user_online(self, event):
        """Broadcast user online status."""
        if event['user_id'] != self.user.id:
            await self.send(text_data=json.dumps({
                'type': 'user_online',
                'user_id': event['user_id'],
                'username': event['username'],
            }))

    async def user_offline(self, event):
        """Broadcast user offline status."""
        await self.send(text_data=json.dumps({
            'type': 'user_offline',
            'user_id': event['user_id'],
            'username': event['username'],
        }))
