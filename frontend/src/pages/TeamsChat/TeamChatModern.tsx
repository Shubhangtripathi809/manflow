import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MessageSquare, Search, Send, Paperclip, Smile, MoreHorizontal,
  Phone, Video, Info, Filter, Image, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { usersApi, chatApi, ChatWebSocketService, GlobalChatWebSocketService } from '@/services/api';
import type { ChatRoom, ChatMessage, ChatRoomMessagesResponse, ToastNotification, WebSocketGlobalMessage, User } from '@/types';


// User status type
type UserStatus = 'online' | 'away' | 'busy' | 'offline';

// Extended user type with last message info
interface UserWithActivity extends User {
  lastMessageTime?: string;
  lastMessageContent?: string;
}

export function TeamChatModern() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  // UI State
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Unread tracking & notifications
  const [unreadCounts, setUnreadCounts] = useState<Map<string, number>>(new Map());
  const [toastNotifications, setToastNotifications] = useState<ToastNotification[]>([]);
  const [roomUserMap, setRoomUserMap] = useState<Map<string, number>>(new Map());
  const [userRoomMap, setUserRoomMap] = useState<Map<number, string>>(new Map());
  const [lastMessages, setLastMessages] = useState<Map<number, { content: string; timestamp: string }>>(new Map());

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // WebSocket References
  const socketRef = useRef<ChatWebSocketService | null>(null);
  const globalSocketRef = useRef<GlobalChatWebSocketService | null>(null);
  const isGlobalSocketInitialized = useRef(false);

  // 1. Fetch Users List
  const { data: usersData, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['team-chat-users'],
    queryFn: () => usersApi.list(),
  });

  // 2. Initialize Global WebSocket ONCE on Mount
  useEffect(() => {
    if (!currentUser || isGlobalSocketInitialized.current) {
      return;
    }

    console.log('🔌 Initializing Global WebSocket for user:', currentUser.username);
    isGlobalSocketInitialized.current = true;

    const globalSocket = new GlobalChatWebSocketService();
    globalSocket.connect();
    globalSocketRef.current = globalSocket;

    // Listen to ALL incoming messages across all rooms
    globalSocket.onMessage((data: WebSocketGlobalMessage) => {
      const { type, message, room_id } = data;

      console.log('📩 Global WebSocket received:', type, 'from room:', room_id);

      if (type === 'chat_message' && message) {
        console.log('💬 Message from:', message.sender.username, 'Content:', message.content);

        // Update last message for this user
        const senderId = message.sender.id;
        if (senderId !== currentUser.id) {
          setLastMessages(prev => {
            const newMap = new Map(prev);
            newMap.set(senderId, {
              content: message.content,
              timestamp: message.timestamp
            });
            return newMap;
          });

          // Map user to room for tracking
          setUserRoomMap(prev => {
            const newMap = new Map(prev);
            newMap.set(senderId, room_id);
            return newMap;
          });
        }

        // ALWAYS update the cache
        queryClient.setQueryData(['chat-messages', room_id], (oldData: ChatRoomMessagesResponse | undefined) => {
          if (!oldData) {
            console.log('📝 Creating new message cache for room:', room_id);
            return { messages: [message], count: 1, has_more: false };
          }

          // Avoid duplicates
          const exists = oldData.messages.some(m => m.id === message.id);
          if (exists) {
            console.log('⚠️ Duplicate message detected, skipping:', message.id);
            return oldData;
          }

          console.log('✅ Adding message to cache for room:', room_id);

          // Add message and sort by timestamp (oldest first)
          const updatedMessages = [...oldData.messages, message].sort((a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );

          return {
            ...oldData,
            messages: updatedMessages,
            count: updatedMessages.length
          };
        });

        // If message is from a different room, show notification
        if (room_id !== activeRoom?.id) {
          console.log('🔔 Showing notification for message from different room');

          // Increment unread count
          setUnreadCounts(prev => {
            const newMap = new Map(prev);
            newMap.set(room_id, (newMap.get(room_id) || 0) + 1);
            return newMap;
          });

          // Show toast notification
          const toast: ToastNotification = {
            id: `${Date.now()}-${Math.random()}`,
            room_id,
            sender_name: message.sender.full_name || message.sender.username,
            message_preview: message.content.substring(0, 60) + (message.content.length > 60 ? '...' : ''),
            timestamp: message.timestamp
          };

          setToastNotifications(prev => [...prev, toast]);

          // Auto-remove toast after 5 seconds
          setTimeout(() => {
            setToastNotifications(prev => prev.filter(t => t.id !== toast.id));
          }, 5000);
        }
      }
    });

    // Cleanup on unmount
    return () => {
      console.log('🧹 Cleaning up Global WebSocket');
      globalSocket.disconnect();
      isGlobalSocketInitialized.current = false;
    };
  }, [currentUser?.id]);

  // 3. Mutation: Create or Get Private Room
  const createRoomMutation = useMutation({
    mutationFn: (userId: number) => chatApi.createPrivateRoom(userId),
    onSuccess: (roomData, userId) => {
      console.log('✅ Room created/retrieved:', roomData.id);
      setActiveRoom(roomData);

      // Map room ID to user ID
      setRoomUserMap(prev => {
        const newMap = new Map(prev);
        newMap.set(roomData.id, userId);
        return newMap;
      });

      // Map user ID to room ID
      setUserRoomMap(prev => {
        const newMap = new Map(prev);
        newMap.set(userId, roomData.id);
        return newMap;
      });
    },
    onError: (error) => {
      console.error("Failed to load chat room", error);
    }
  });

  // 4. Query: Fetch HISTORY Messages
  const { data: messagesData, isLoading: isLoadingMessages } = useQuery({
    queryKey: ['chat-messages', activeRoom?.id],
    queryFn: async () => {
      if (!activeRoom?.id) return { messages: [], count: 0, has_more: false };

      // CRITICAL: Get existing messages from cache BEFORE making API call
      const existingData = queryClient.getQueryData<ChatRoomMessagesResponse>(['chat-messages', activeRoom.id]);

      // Fetch historical messages from API
      const response = await chatApi.getRoomMessages(activeRoom.id);

      // If we have WebSocket messages in cache, preserve them
      if (existingData && existingData.messages.length > 0) {
        console.log('🔄 Merging WebSocket messages with API messages');

        // Create a Set of existing message IDs (from WebSocket)
        const existingIds = new Set(existingData.messages.map(m => m.id));

        // Add only NEW messages from API that aren't already in cache
        const newMessagesFromAPI = response.messages.filter(m => !existingIds.has(m.id));

        // Combine: existing WebSocket messages + new API messages
        const allMessages = [...existingData.messages, ...newMessagesFromAPI].sort((a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        console.log(`✅ Merged: ${existingData.messages.length} cached + ${newMessagesFromAPI.length} new from API = ${allMessages.length} total`);

        return {
          messages: allMessages,
          count: allMessages.length,
          has_more: response.has_more
        };
      }

      // No existing cache - return API response as-is
      console.log('📥 No cached messages, using API response');
      return response;
    },
    enabled: !!activeRoom?.id,
    // CRITICAL: Don't refetch on mount/focus - WebSocket handles real-time updates
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

  // 5. Room-specific WebSocket
  useEffect(() => {
    if (!activeRoom?.id) return;

    console.log('🔌 Connecting to room-specific WebSocket:', activeRoom.id);

    const socket = new ChatWebSocketService();
    socket.connect(activeRoom.id);
    socketRef.current = socket;

    // Clear unread count when opening a room
    setUnreadCounts(prev => {
      const newMap = new Map(prev);
      newMap.delete(activeRoom.id);
      return newMap;
    });

    // Listen for messages
    socket.onMessage((newMessage) => {
      console.log('📩 Room WebSocket received message:', newMessage.content);

      queryClient.setQueryData(['chat-messages', activeRoom.id], (oldData: ChatRoomMessagesResponse | undefined) => {
        if (!oldData) {
          return { messages: [newMessage], count: 1, has_more: false };
        }

        // Check if message already exists (could be from Global WebSocket)
        const exists = oldData.messages.some(m => m.id === newMessage.id);
        if (exists) {
          console.log('⚠️ Message already in cache (from Global WS), skipping');
          return oldData;
        }

        // Add message and sort by timestamp (oldest first)
        const updatedMessages = [...oldData.messages, newMessage].sort((a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        return {
          ...oldData,
          messages: updatedMessages,
          count: updatedMessages.length
        };
      });
    });

    return () => {
      console.log('🧹 Disconnecting from room WebSocket:', activeRoom.id);
      socket.disconnect();
    };
  }, [activeRoom?.id, queryClient]);

  const messages = useMemo(() => {
    if (!messagesData?.messages) return [];

    // Always sort messages by timestamp (oldest first)
    return [...messagesData.messages].sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [messagesData?.messages]);

  // Filter and sort users with activity
  const users = useMemo(() => {
    if (!usersData?.results) return [];
    return usersData.results.filter(u => u.id !== currentUser?.id && u.is_active);
  }, [usersData, currentUser?.id]);

  const usersWithActivity = useMemo((): UserWithActivity[] => {
    return users.map(user => {
      const lastMsg = lastMessages.get(user.id);
      return {
        ...user,
        lastMessageTime: lastMsg?.timestamp,
        lastMessageContent: lastMsg?.content
      };
    });
  }, [users, lastMessages]);

  // Sort users: unread first, then by last message time, then alphabetically
  const sortedUsers = useMemo(() => {
    return [...usersWithActivity].sort((a, b) => {
      // Get room IDs for both users
      const roomA = userRoomMap.get(a.id);
      const roomB = userRoomMap.get(b.id);

      // Priority 1: Unread messages
      const unreadA = roomA ? (unreadCounts.get(roomA) || 0) : 0;
      const unreadB = roomB ? (unreadCounts.get(roomB) || 0) : 0;

      if (unreadA !== unreadB) {
        return unreadB - unreadA; // More unread first
      }

      // Priority 2: Last message time
      if (a.lastMessageTime && b.lastMessageTime) {
        return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
      }
      if (a.lastMessageTime) return -1;
      if (b.lastMessageTime) return 1;

      // Priority 3: Alphabetical by name
      const nameA = a.first_name || a.username;
      const nameB = b.first_name || b.username;
      return nameA.localeCompare(nameB);
    });
  }, [usersWithActivity, unreadCounts, userRoomMap]);

  const filteredUsers = useMemo(() => {
    if (!searchQuery) return sortedUsers;

    return sortedUsers.filter(user =>
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [sortedUsers, searchQuery]);

  const selectedUser = users.find(u => u.id === selectedUserId);

  // Helper: Get unread count for a specific user
  const getUserUnreadCount = (userId: number): number => {
    const roomId = userRoomMap.get(userId);
    return roomId ? (unreadCounts.get(roomId) || 0) : 0;
  };

  // Helper: Check if user has unread messages
  const hasUnreadMessages = (userId: number): boolean => {
    return getUserUnreadCount(userId) > 0;
  };

  // Helper: Mock User Status 
  const getUserStatus = (userId: number): UserStatus => {
    return userId % 2 === 0 ? 'online' : 'offline';
  };

  // Select User -> Create/Get Room
  const handleUserSelect = (userId: number) => {
    if (selectedUserId === userId) return;

    console.log('👤 User selected:', userId);
    setSelectedUserId(userId);
    setActiveRoom(null);
    createRoomMutation.mutate(userId);
  };

  // Send Message
  const handleSendMessage = () => {
    if (!messageInput.trim() || !activeRoom || !socketRef.current) return;

    console.log('📤 Sending message:', messageInput);

    // Send via WebSocket
    socketRef.current.sendMessage(messageInput);

    // Clear input immediately
    setMessageInput('');
  };

  // Send on Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Status Indicator Dot
  const StatusIndicator = ({ status }: { status: UserStatus }) => {
    const colors = {
      online: 'bg-green-500',
      away: 'bg-yellow-500',
      busy: 'bg-red-500',
      offline: 'bg-gray-400',
    };

    return (
      <div className={cn('absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white', colors[status])} />
    );
  };

  // Toast Notification Component
  const ToastNotificationComponent = ({ toast }: { toast: ToastNotification }) => (
    <div className="flex items-start gap-3 p-4 bg-white rounded-lg shadow-lg border border-gray-200 min-w-[300px] max-w-[400px] animate-slide-in">
      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center font-semibold text-blue-700 text-sm flex-shrink-0">
        {toast.sender_name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-gray-900">{toast.sender_name}</p>
        <p className="text-xs text-gray-600 mt-0.5 truncate">{toast.message_preview}</p>
      </div>
      <button
        onClick={() => setToastNotifications(prev => prev.filter(t => t.id !== toast.id))}
        className="text-gray-400 hover:text-gray-600 flex-shrink-0 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#f3f2f1]">
      {/* Toast Notifications Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toastNotifications.map(toast => (
          <ToastNotificationComponent key={toast.id} toast={toast} />
        ))}
      </div>

      {/* Left Sidebar - User List */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-3 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Chat</h2>
            <div className="flex items-center gap-1">
              <button className="p-1.5 hover:bg-gray-100 rounded transition-colors">
                <Filter className="h-4 w-4 text-gray-600" />
              </button>
              <button className="p-1.5 hover:bg-gray-100 rounded transition-colors">
                <MoreHorizontal className="h-4 w-4 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* User List */}
        <div className="flex-1 overflow-y-auto">
          {isLoadingUsers ? (
            <div className="p-8 text-center">
              <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-3"></div>
              <p className="text-sm text-gray-500">Loading users...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center">
              <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">
                {searchQuery ? 'No users found' : 'No users available'}
              </p>
            </div>
          ) : (
            filteredUsers.map((user) => {
              const isSelected = selectedUserId === user.id;
              const status = getUserStatus(user.id);
              const unreadCount = getUserUnreadCount(user.id);
              const hasUnread = hasUnreadMessages(user.id);

              return (
                <div
                  key={user.id}
                  onClick={() => handleUserSelect(user.id)}
                  className={cn(
                    'flex items-start gap-3 px-4 py-3 cursor-pointer border-l-3 transition-colors',
                    isSelected
                      ? 'bg-blue-50 border-l-blue-600'
                      : 'bg-white border-l-transparent hover:bg-gray-50'
                  )}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0 mt-0.5">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center font-semibold text-blue-700 text-sm">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <StatusIndicator status={status} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between mb-0.5">
                      <span className={cn(
                        "text-sm truncate",
                        hasUnread || user.lastMessageTime ? "font-bold text-gray-900" : "font-medium text-gray-900"
                      )}>
                        {user.first_name || user.last_name
                          ? `${user.first_name} ${user.last_name}`.trim()
                          : user.username}
                      </span>

                      {/* Unread Badge */}
                      {hasUnread && (
                        <span className="ml-2 px-1.5 py-0.5 text-[10px] font-semibold bg-red-500 text-white rounded-full">
                          {unreadCount}
                        </span>
                      )}

                      {!hasUnread && user.lastMessageTime && (
                        <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                          {new Date(user.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {user.lastMessageContent ? (
                        <p className={cn(
                          "text-xs truncate flex-1",
                          hasUnread ? "font-semibold text-gray-700" : "text-gray-600"
                        )}>
                          {user.lastMessageContent}
                        </p>
                      ) : (
                        <p className="text-xs truncate flex-1 text-gray-600">
                          {user.email}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Side - Chat Window */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="h-14 px-4 flex items-center justify-between bg-white border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center font-semibold text-blue-700 text-sm">
                    {selectedUser.username.charAt(0).toUpperCase()}
                  </div>
                  <StatusIndicator status={getUserStatus(selectedUser.id)} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-gray-900">
                    {selectedUser.first_name || selectedUser.last_name
                      ? `${selectedUser.first_name} ${selectedUser.last_name}`.trim()
                      : selectedUser.username}
                  </h3>
                  <p className="text-xs text-gray-600 capitalize">
                    {getUserStatus(selectedUser.id)} • {selectedUser.role}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button className="p-2 hover:bg-gray-100 rounded transition-colors">
                  <Video className="h-4 w-4 text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded transition-colors">
                  <Phone className="h-4 w-4 text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded transition-colors">
                  <Info className="h-4 w-4 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 bg-[#f3f2f1]">
              {createRoomMutation.isPending ? (
                <div className="h-full flex items-center justify-center">
                  <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-base font-medium text-gray-600">Start the conversation</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Say hi to {selectedUser?.first_name || selectedUser?.username}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg: ChatMessage) => {
                    // Compare by both ID and username for safety
                    const isMe = msg.sender.id === currentUser?.id || msg.sender.username === currentUser?.username;

                    return (
                      <div key={msg.id} className={cn("flex items-start gap-2", isMe ? "justify-end" : "justify-start")}>
                        {/* Show avatar for receiver messages only */}
                        {!isMe && (
                          <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center font-semibold text-gray-700 text-xs flex-shrink-0 mt-1">
                            {msg.sender.username.charAt(0).toUpperCase()}
                          </div>
                        )}

                        <div className={cn(
                          "max-w-[70%] rounded-lg p-3",
                          isMe
                            ? "bg-blue-600 text-white"
                            : "bg-white text-gray-900 shadow-sm border border-gray-200"
                        )}>
                          {!isMe && (
                            <p className="text-[10px] font-semibold text-gray-600 mb-1">
                              {msg.sender.full_name || msg.sender.username}
                            </p>
                          )}
                          <p className="text-sm break-words">{msg.content}</p>
                          <span className={cn(
                            "text-[10px] block mt-1",
                            isMe ? "text-blue-100 text-right" : "text-gray-500 text-left"
                          )}>
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {/* Show avatar for sender messages only */}
                        {isMe && (
                          <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center font-semibold text-white text-xs flex-shrink-0 mt-1">
                            {currentUser?.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="p-4 bg-white border-t border-gray-200">
              <div className="flex items-end gap-2">
                {/* Attachment Button */}
                <button className="p-2 hover:bg-gray-100 rounded transition-colors">
                  <Paperclip className="h-5 w-5 text-gray-600" />
                </button>

                {/* Input Area */}
                <div className="flex-1 relative">
                  <textarea
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message"
                    rows={1}
                    className="w-full px-3 py-2 pr-24 text-sm border border-gray-300 rounded resize-none focus:outline-none focus:border-blue-500 max-h-32"
                    style={{ fieldSizing: 'content' } as any}
                  />

                  {/* Right side buttons in input */}
                  <div className="absolute right-2 bottom-2 flex items-center gap-1">
                    <button className="p-1.5 hover:bg-gray-100 rounded transition-colors">
                      <Smile className="h-4 w-4 text-gray-600" />
                    </button>
                    <button className="p-1.5 hover:bg-gray-100 rounded transition-colors">
                      <Image className="h-4 w-4 text-gray-600" />
                    </button>
                  </div>
                </div>

                {/* Send Button */}
                <button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim()}
                  className={cn(
                    'p-2.5 rounded transition-colors',
                    messageInput.trim()
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  )}
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Empty State */
          <div className="flex-1 flex items-center justify-center bg-[#f3f2f1]">
            <div className="text-center max-w-sm">
              <div className="h-20 w-20 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-10 w-10 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Welcome to Chat</h3>
              <p className="text-gray-600 text-sm">
                Select a user from the list to start messaging
              </p>
              <p className="text-xs text-gray-400 mt-4">
                {users.length} {users.length === 1 ? 'user' : 'users'} available
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}