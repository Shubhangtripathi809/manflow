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

// documentsConfig.tsx updates
// documentsConfig.tsx
export const createDocumentsTableColumns = (): TableColumn<Document>[] => [
  {
    key: 'name',
    label: 'Document',
    render: (doc: any) => (
      <div className="flex items-center gap-2">
        <FileText className="w-4 h-4 text-blue-600" />
        <span className="font-medium text-[#172b4d] truncate max-w-[250px]">
          {doc.name}
        </span>
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
  return (
    <Card className="h-full hover:shadow-md transition-shadow cursor-pointer group">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 flex-1">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base truncate">{doc.name}</h3>
              {doc.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                  {doc.description}
                </p>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
            onClick={(e) => onDeleteClick(e, doc)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Project:</span>
            <Link
              to={`/projects/${doc.project}`}
              onClick={(e) => e.stopPropagation()}
              className="text-xs hover:text-primary font-medium truncate"
            >
              {doc.project_name || `Project ${doc.project}`}
            </Link>
          </div>

          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-xs">
              {doc.file_type}
            </Badge>
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(doc.status)}`}
            >
              {doc.status.replace('_', ' ')}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
            <span>Updated {formatRelativeTime(doc.updated_at)}</span>
            <span className="font-medium">
              {doc.assigned_users && doc.assigned_users.length > 0
                ? doc.assigned_users[0].full_name || doc.assigned_users[0].username
                : doc.created_by?.full_name || doc.created_by?.username || 'System'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}