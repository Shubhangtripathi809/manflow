import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BellOff, Search, X } from 'lucide-react';
import { notificationsApi } from '@/services/api';
import { cn } from '@/lib/utils';

export function NotificationsPage({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list(),
  });

  const markAsRead = useMutation({
    mutationFn: (id: number) => notificationsApi.markAsRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const notifications = data?.notifications || [];
  const filtered = filter === 'unread' 
    ? notifications.filter((n: any) => !n.is_read) 
    : notifications;

  return (
    <div className="flex flex-col h-full ">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <h2 className="font-bold text-lg">Activity</h2>
        <div className="flex items-center gap-2">
           <Search className="h-4 w-4 opacity-50 cursor-pointer hover:opacity-100" />
           <X className="h-4 w-4 opacity-50 cursor-pointer hover:opacity-100" onClick={onClose} />
        </div>
      </div>

      {/* Toggle Filter */}
      <div className="p-3">
        <div className="flex p-1 bg-white/5 rounded-lg">
          <button 
            onClick={() => setFilter('all')}
            className={cn(
              "flex-1 py-1.5 text-xs font-medium rounded-md transition-all",
              filter === 'all' ? "bg-[#97bd30] text-white" : "text-black/60"
            )}
          >
            All
          </button>
          <button 
            onClick={() => setFilter('unread')}
            className={cn(
              "flex-1 py-1.5 text-xs font-medium rounded-md transition-all",
              filter === 'unread' ? "bg-[#97bd30] text-white" : "text-black/60"
            )}
          >
            Unread
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {isLoading ? (
          <div className="p-10 text-center opacity-50 text-sm italic">Loading...</div>
        ) : filtered.length > 0 ? (
          filtered.map((n: any) => (
            <div 
              key={n.id} 
              onClick={() => !n.is_read && markAsRead.mutate(n.id)}
              className={cn(
                "p-4 border-b border-white/5 hover:bg-white/10 cursor-pointer relative transition-colors",
                !n.is_read && "bg-white/[0.03]"
              )}
            >
              {!n.is_read && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#97bd30]" />}
              <div className="flex justify-between items-start mb-1">
                <span className="text-[10px] uppercase font-bold text-[#97bd30]">{n.notification_type}</span>
                <span className="text-[10px] opacity-40">{n.time_since}</span>
              </div>
              <p className="text-sm font-semibold leading-snug">{n.title}</p>
              <p className="text-xs opacity-60 line-clamp-2 mt-1">{n.message}</p>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full opacity-40">
            <BellOff className="h-10 w-10 mb-2" />
            <p className="text-sm">No activity found</p>
          </div>
        )}
      </div>
    </div>
  );
}