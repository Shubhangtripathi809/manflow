import React from 'react';
import { Calendar, Users } from 'lucide-react';
import type { Task } from '@/types';
import type { TableColumn } from '../DualView';

const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
};

export const getStatusConfig = (status: Task['status']) => {
  const normalizedStatus = status.toUpperCase();
  switch (normalizedStatus) {
    case 'PENDING':
      return {
        bg: 'bg-yellow-50',
        text: 'text-yellow-800',
        badge: 'bg-yellow-500',
        cardClass: 'card-pending',
        label: 'PENDING',
        color: '#f59e0b',
      };
    case 'BACKLOG':
      return {
        bg: 'bg-orange-50',
        text: 'text-orange-800',
        badge: 'bg-orange-500',
        cardClass: 'card-backlog',
        label: 'BACKLOG',
        color: '#f97316',
      };
    case 'IN_PROGRESS':
      return {
        bg: 'bg-blue-50',
        text: 'text-blue-800',
        badge: 'bg-blue-500',
        cardClass: 'card-in-progress',
        label: 'IN PROGRESS',
        color: '#3b82f6',
      };
    case 'COMPLETED':
      return {
        bg: 'bg-green-50',
        text: 'text-green-800',
        badge: 'bg-green-500',
        cardClass: 'card-completed',
        label: 'COMPLETED',
        color: '#22c55e',
      };
    case 'DEPLOYED':
      return {
        bg: 'bg-purple-50',
        text: 'text-purple-800',
        badge: 'bg-purple-500',
        cardClass: 'card-deployed',
        label: 'DEPLOYED',
        color: '#8b5cf6',
      };
    case 'DEFERRED':
      return {
        bg: 'bg-gray-50',
        text: 'text-gray-800',
        badge: 'bg-gray-500',
        cardClass: 'card-deferred',
        label: 'DEFERRED',
        color: '#6b7280',
      };
    default:
      return {
        bg: 'bg-gray-50',
        text: 'text-gray-800',
        badge: 'bg-gray-500',
        cardClass: 'card-gray',
        label: normalizedStatus,
        color: '#9ca3af',
      };
  }
};

export const tasksTableColumns: TableColumn<Task>[] = [
  {
    key: 'heading',
    label: 'Task',
    render: (task : any) => (
      <div className="font-medium text-sm">{task.heading || 'No Task'}</div>
    ),
  },
  {
    key: 'status',
    label: 'Status',
    width: '140px',
    render: (task: any) => {
      const statusConfig = getStatusConfig(task.status);
      return (
        <span
          className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold ${statusConfig.badge} text-white`}
        >
          {statusConfig.label}
        </span>
      );
    },
  },
  {
    key: 'start_date',
    label: 'Start Date',
    width: '120px',
    render: (task: any) => (
      <span className="text-sm text-muted-foreground">
        {formatDate(task.start_date)}
      </span>
    ),
  },
  {
    key: 'end_date',
    label: 'End Date',
    width: '120px',
    render: (task: any) => (
      <span className="text-sm text-muted-foreground">
        {formatDate(task.end_date)}
      </span>
    ),
  },
  {
    key: 'assigned_to',
    label: 'Assigned',
    width: '100px',
    render: (task: any) => (
      <span className="flex items-center gap-1 text-sm text-muted-foreground">
        <Users className="w-4 h-4" />
        {task.assigned_to.length}
      </span>
    ),
  },
];

interface TaskGridCardProps {
  task: Task;
}

export function TaskGridCard({ task }: TaskGridCardProps) {
  const statusConfig = getStatusConfig(task.status);
  
  return (
    <div
      className={`${statusConfig.cardClass} rounded-xl p-4 transition-all duration-300 cursor-pointer text-gray-800 hover:shadow-lg hover:-translate-y-0.5 border border-[#d0d5dd]`}
    >
      <div className="flex items-start justify-between mb-2">
        <span
          className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold ${statusConfig.badge} text-white`}
        >
          {statusConfig.label}
        </span>
      </div>
      <div className="text-xs font-bold text-black-600 mb-1">
        {task.heading || 'No Task'}
      </div>
      <div className="space-y-1 text-xs text-gray-500">
        <div className="flex items-center">
          <Calendar className="w-3 h-3 mr-1" />
          <span className="font-medium">Start:</span>
          <span className="ml-1">{formatDate(task.start_date)}</span>
        </div>
        <div className="flex items-center">
          <Calendar className="w-3 h-3 mr-1" />
          <span className="font-medium">End:</span>
          <span className="ml-1">{formatDate(task.end_date)}</span>
        </div>
        <div className="flex items-center">
          <Users className="w-3 h-3 mr-1" />
          <span className="font-medium">Assigned:</span>
          <span className="ml-1">{task.assigned_to.length}</span>
        </div>
      </div>
    </div>
  );
}