"""
WebSocket consumers for real-time chat.
"""
import json
import logging
from typing import Optional, Dict, Any
from uuid import UUID

from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model

from .models import ChatRoom, ChatMessage, ChatRoomMembership
from .services import ChatRoomService, ChatMessageService, ChatPermissionService

logger = logging.getLogger(__name__)
User = get_user_model()


class ChatConsumer(AsyncWebsocketConsumer):
    """
    Main WebSocket consumer for chat functionality.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.room_id: Optional[str] = None
        self.room_group_name: Optional[str] = None
        self.room: Optional[ChatRoom] = None
        self.user = None

    async def connect(self):
        """Handle WebSocket connection."""
        # Get user from scope
        self.user = self.scope.get('user')
        
        # Require authentication
        if not self.user or not self.user.is_authenticated:
            logger.warning("WebSocket connection rejected: Not authenticated")
            await self.close(code=4001)
            return
        
        # Get room_id from URL
        self.room_id = self.scope['url_route']['kwargs'].get('room_id')
        
        if not self.room_id:
            logger.warning("WebSocket connection rejected: No room_id provided")
            await self.close(code=4002)
            return
        
        # Get room and check access
        self.room = await self.get_room()
        
        if not self.room:
            logger.warning(f"WebSocket connection rejected: Room not found - {self.room_id}")
            await self.close(code=4003)
            return
        
        # Check room access permission
        has_access = await self.check_access()
        if not has_access:
            logger.warning(f"WebSocket connection rejected: Access denied for user {self.user.id}")
            await self.close(code=4004)
            return
        
        # Set channel group name
        self.room_group_name = f"chat_{self.room_id}"
        
        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        # Accept the WebSocket connection
        await self.accept()
        
        logger.info(f"User {self.user.username} connected to room {self.room_id}")
        
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
            'room_name': self.room.name,
            'room_type': self.room.room_type,
        }))

    async def disconnect(self, close_code):
        """Handle WebSocket disconnection."""
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
        
        logger.info(f"User disconnected from room {self.room_id}, code: {close_code}")

    async def receive(self, text_data):
        """Handle incoming WebSocket messages."""
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
        """Handle incoming chat message."""
        content = data.get('content', '').strip()
        message_type = data.get('message_type', 'text')
        reply_to_id = data.get('reply_to')
        
        if not content and message_type == 'text':
            await self.send_error("Message content is required")
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
        """Handle typing indicator."""
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
        """Handle read receipt."""
        message_id = data.get('message_id')
        count = await self.mark_messages_read()
        
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
        """Handle message deletion request."""
        message_id = data.get('message_id')
        
        if not message_id:
            await self.send_error("Message ID is required")
            return
        
        success = await self.delete_message(message_id)
        
        if success:
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'message_deleted_broadcast',
                    'message_id': message_id,
                    'deleted_by': self.user.id,
                }
            )
        else:
            await self.send_error("Failed to delete message")

    # Group message handlers
    async def chat_message_broadcast(self, event):
        """Send chat message to WebSocket."""
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'message': event['message'],
        }))

    async def typing_broadcast(self, event):
        """Send typing indicator to WebSocket."""
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
        """Send message deletion notification."""
        await self.send(text_data=json.dumps({
            'type': 'message_deleted',
            'message_id': event['message_id'],
            'deleted_by': event['deleted_by'],
        }))

    async def user_joined(self, event):
        """Send user joined notification."""
        if event['user_id'] != self.user.id:
            await self.send(text_data=json.dumps({
                'type': 'user_joined',
                'user_id': event['user_id'],
                'username': event['username'],
            }))

    async def user_left(self, event):
        """Send user left notification."""
        await self.send(text_data=json.dumps({
            'type': 'user_left',
            'user_id': event['user_id'],
            'username': event['username'],
        }))

    async def send_error(self, message: str):
        """Send error message to client."""
        await self.send(text_data=json.dumps({
            'type': 'error',
            'message': message,
        }))

    # Database operations
    @database_sync_to_async
    def get_room(self):
        """Get room by ID from database."""
        try:
            return ChatRoom.objects.select_related('project').get(
                id=self.room_id,
                is_active=True
            )
        except ChatRoom.DoesNotExist:
            return None

    @database_sync_to_async
    def check_access(self) -> bool:
        """Check if user has access to room."""
        return ChatRoomService.check_room_access(self.room, self.user)

    @database_sync_to_async
    def save_message(self, content: str, message_type: str = 'text', reply_to_id: Optional[str] = None):
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
    """WebSocket consumer for user notifications."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.user = None
        self.notification_group_name: Optional[str] = None

    async def connect(self):
        self.user = self.scope.get('user')
        
        if not self.user or not self.user.is_authenticated:
            await self.close(code=4001)
            return
        
        self.notification_group_name = f"notifications_{self.user.id}"
        
        await self.channel_layer.group_add(
            self.notification_group_name,
            self.channel_name
        )
        
        await self.accept()
        logger.info(f"User {self.user.username} connected to notifications")

    async def disconnect(self, close_code):
        if self.notification_group_name:
            await self.channel_layer.group_discard(
                self.notification_group_name,
                self.channel_name
            )

    async def receive(self, text_data):
        pass

    async def new_message_notification(self, event):
        await self.send(text_data=json.dumps({
            'type': 'new_message',
            'room_id': event['room_id'],
            'room_name': event['room_name'],
            'sender_username': event['sender_username'],
            'message_preview': event['message_preview'],
        }))


class OnlineStatusConsumer(AsyncWebsocketConsumer):
    """Consumer for tracking online/offline status."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.user = None
        self.presence_group = "presence"

    async def connect(self):
        self.user = self.scope.get('user')
        
        if not self.user or not self.user.is_authenticated:
            await self.close(code=4001)
            return
        
        await self.channel_layer.group_add(
            self.presence_group,
            self.channel_name
        )
        
        await self.accept()
        
        await self.channel_layer.group_send(
            self.presence_group,
            {
                'type': 'user_online',
                'user_id': self.user.id,
                'username': self.user.username,
            }
        )

    async def disconnect(self, close_code):
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
        if event['user_id'] != self.user.id:
            await self.send(text_data=json.dumps({
                'type': 'user_online',
                'user_id': event['user_id'],
                'username': event['username'],
            }))

    async def user_offline(self, event):
        await self.send(text_data=json.dumps({
            'type': 'user_offline',
            'user_id': event['user_id'],
            'username': event['username'],
        }))

class GlobalChatConsumer(AsyncWebsocketConsumer):
    """
    Global WebSocket consumer that receives messages from ALL rooms user belongs to.
    Used for notifications when user is not in chat page.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.user = None
        self.user_group_name: Optional[str] = None
        self.room_groups: list = []

    async def connect(self):
        """Handle WebSocket connection - join all user's room groups."""
        self.user = self.scope.get('user')
        
        if not self.user or not self.user.is_authenticated:
            logger.warning("Global WebSocket rejected: Not authenticated")
            await self.close(code=4001)
            return
        
        # Create user-specific group for direct notifications
        self.user_group_name = f"user_{self.user.id}"
        
        # Join user's personal notification group
        await self.channel_layer.group_add(
            self.user_group_name,
            self.channel_name
        )
        
        # Get all rooms user belongs to and join their groups
        self.room_groups = await self.get_user_room_groups()
        
        for group_name in self.room_groups:
            await self.channel_layer.group_add(
                group_name,
                self.channel_name
            )
        
        await self.accept()
        
        logger.info(f"User {self.user.username} connected to global chat ({len(self.room_groups)} rooms)")
        
        # Send connection confirmation
        await self.send(text_data=json.dumps({
            'type': 'connection_established',
            'message': 'Connected to global chat',
            'rooms_count': len(self.room_groups),
        }))

    async def disconnect(self, close_code):
        """Leave all room groups on disconnect."""
        # Leave user group
        if self.user_group_name:
            await self.channel_layer.group_discard(
                self.user_group_name,
                self.channel_name
            )
        
        # Leave all room groups
        for group_name in self.room_groups:
            await self.channel_layer.group_discard(
                group_name,
                self.channel_name
            )
        
        logger.info(f"User {self.user.username if self.user else 'Unknown'} disconnected from global chat")

    async def receive(self, text_data):
        """Handle incoming messages - global doesn't accept messages, only receives."""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'ping':
                await self.send(text_data=json.dumps({'type': 'pong'}))
            elif message_type == 'refresh_rooms':
                # Refresh room subscriptions
                await self.refresh_room_subscriptions()
            else:
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'message': 'Global connection is read-only. Connect to specific room to send messages.'
                }))
        except json.JSONDecodeError:
            pass

    async def refresh_room_subscriptions(self):
        """Refresh room group subscriptions (when user joins/leaves rooms)."""
        # Leave old groups
        for group_name in self.room_groups:
            await self.channel_layer.group_discard(
                group_name,
                self.channel_name
            )
        
        # Get updated room list
        self.room_groups = await self.get_user_room_groups()
        
        # Join new groups
        for group_name in self.room_groups:
            await self.channel_layer.group_add(
                group_name,
                self.channel_name
            )
        
        await self.send(text_data=json.dumps({
            'type': 'rooms_refreshed',
            'rooms_count': len(self.room_groups),
        }))

    # Message handlers - receive broadcasts from rooms
    async def chat_message_broadcast(self, event):
        """Receive chat message from any room."""
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'message': event['message'],
        }))

    async def typing_broadcast(self, event):
        """Receive typing indicator."""
        if event['user_id'] != self.user.id:
            await self.send(text_data=json.dumps({
                'type': 'typing',
                'user_id': event['user_id'],
                'username': event['username'],
                'is_typing': event['is_typing'],
            }))

    async def user_joined(self, event):
        """Receive user joined notification."""
        if event['user_id'] != self.user.id:
            await self.send(text_data=json.dumps({
                'type': 'user_joined',
                'user_id': event['user_id'],
                'username': event['username'],
            }))

    async def user_left(self, event):
        """Receive user left notification."""
        await self.send(text_data=json.dumps({
            'type': 'user_left',
            'user_id': event['user_id'],
            'username': event['username'],
        }))

    async def message_deleted_broadcast(self, event):
        """Receive message deletion notification."""
        await self.send(text_data=json.dumps({
            'type': 'message_deleted',
            'message_id': event['message_id'],
            'deleted_by': event['deleted_by'],
        }))

    async def new_room_notification(self, event):
        """Receive notification when added to a new room."""
        await self.send(text_data=json.dumps({
            'type': 'new_room',
            'room_id': event['room_id'],
            'room_name': event['room_name'],
            'room_type': event['room_type'],
        }))
        
        # Auto-subscribe to the new room
        await self.refresh_room_subscriptions()

    @database_sync_to_async
    def get_user_room_groups(self) -> list:
        """Get all channel group names for rooms user belongs to."""
        from .models import ChatRoom, ChatRoomMembership
        
        # Get rooms user is a member of
        room_ids = ChatRoomMembership.objects.filter(
            user=self.user
        ).values_list('room_id', flat=True)
        
        # Get global rooms (everyone can access)
        global_rooms = ChatRoom.objects.filter(
            room_type=ChatRoom.RoomType.GLOBAL,
            is_active=True
        ).values_list('id', flat=True)
        
        # Combine and create group names
        all_room_ids = set(room_ids) | set(global_rooms)
        
        return [f"chat_{room_id}" for room_id in all_room_ids]