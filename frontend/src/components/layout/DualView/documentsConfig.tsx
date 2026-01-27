import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Trash2 } from 'lucide-react';
import { Badge, Button, Card, CardContent } from '@/components/common';
import { formatRelativeTime, getStatusColor } from '@/lib/utils';
import type { Document } from '@/types';
import type { TableColumn } from '../DualView';

interface DocumentTableColumnsProps {
  onDeleteClick: (e: React.MouseEvent, doc: Document) => void;
}

export const createDocumentsTableColumns = ({ onDeleteClick }: DocumentTableColumnsProps): TableColumn<Document>[] => [
  {
    key: 'name',
    label: 'Document',
    render: (doc: any) => (
      <div className="flex items-center justify-between w-full group/cell">
        <div className="flex items-center gap-2 min-w-0 pr-2">
          <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span className="font-medium text-[#172b4d] truncate" title={doc.name}>
            {doc.name}
          </span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDeleteClick(e, doc);
          }}
          className="opacity-0 group-hover:opacity-100 transition-all duration-200 p-1.5 hover:bg-red-50 rounded flex-shrink-0"
          title="Delete Document"
        >
          <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-600" />
        </button>
      </div>
    ),
  },
  {
    key: 'project',
    label: 'Project',
    render: (doc: any) => (
      <span className="text-[12px] text-gray-700 font-medium">
        {doc.project_name || 'General'}
      </span>
    ),
  },
  {
    key: 'file_type',
    label: 'Type',
    width: '100px',
    render: (doc: any) => (
      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600 uppercase border border-gray-200">
        {doc.file_type}
      </span>
    ),
  },
  {
    key: 'status',
    label: 'Status',
    width: '140px',
    render: (doc: any) => (
      <div className={`inline-flex items-center px-2 py-1 rounded-lg text-[11px] font-bold uppercase bg-blue-600 text-white shadow-sm`}>
        {doc.status.replace('_', ' ')}
      </div>
    ),
  },
  {
    key: 'created_by',
    label: 'Uploaded By',
    render: (doc: any) => (
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-700">
          {doc.created_by?.full_name?.charAt(0) || 'U'}
        </div>
        <span className="text-gray-700">{doc.created_by?.full_name || 'System'}</span>
      </div>
    ),
  },
];

interface DocumentGridCardProps {
  document: Document;
  onDeleteClick: (e: React.MouseEvent, doc: Document) => void;
}

export function DocumentGridCard({ document: doc, onDeleteClick }: DocumentGridCardProps) {
  const getStatusConfig = (status: string) => {
    const s = status.toLowerCase();
    switch (s) {
      case 'approved':
        return { badge: 'bg-green-50 text-green-600 border border-green-200', label: 'APPROVED' };
      case 'in_review':
        return { badge: 'bg-blue-50 text-blue-600 border border-blue-200', label: 'IN REVIEW' };
      case 'draft':
        return { badge: 'bg-yellow-50 text-yellow-600 border border-yellow-200', label: 'DRAFT' };
      case 'archived':
        return { badge: 'bg-gray-100 text-gray-600 border border-gray-200', label: 'ARCHIVED' };
      default:
        return { badge: 'bg-gray-50 text-gray-600 border border-gray-200', label: status.toUpperCase().replace('_', ' ') };
    }
  };

  const statusConfig = getStatusConfig(doc.status);

  return (
    <div
      onClick={() => window.location.href = `/documents/${doc.id}`}
      className="bg-white rounded-xl p-4 transition-all duration-300 cursor-pointer text-gray-800 hover:shadow-lg hover:-translate-y-0.5 border border-[#d0d5dd] relative hover:z-50 h-full group"
    >
      {/* Header */}
      <div className="flex justify-between items-start gap-2 mb-3">
        <div className="pr-2 flex flex-col">
          {/* Project Name */}
          <span className="text-sm font-bold text-gray-900 line-clamp-1 mb-0.5" title={doc.project_name}>
            {doc.project_name || 'General'}
          </span>
          {/* Document Name */}
          <span className="text-xs font-medium text-gray-600 line-clamp-2" title={doc.name}>
            {doc.name}
          </span>
        </div>
        <div className="text-[10px] text-gray-400 whitespace-nowrap flex-shrink-0 mt-0.5">
          {formatRelativeTime(doc.updated_at)}
        </div>
      </div>

      {/* Details Section */}
      <div className="space-y-1 text-xs text-gray-500 mb-6">
        <div className="flex items-center">
          <FileText className="w-3 h-3 mr-1" />
          <span className="font-medium">Type:</span>
          <span className="ml-1 uppercase">{doc.file_type}</span>
        </div>
      </div>

      {/* Trash Button */}
      <button
        onClick={(e) => onDeleteClick(e, doc)}
        className="absolute bottom-3 left-3 opacity-0 group-hover:opacity-100 transition-all duration-200 p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-600"
        title="Delete Document"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      {/* Status Badge */}
      <div className="absolute bottom-3 right-3">
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${statusConfig.badge}`}>
          {statusConfig.label}
        </span>
      </div>
    </div>
  );
}