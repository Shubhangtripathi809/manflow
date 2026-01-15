import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import {
  FileText,
  Search,
  Filter,
  Plus,
  ChevronDown,
  Trash2,
} from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  Badge,
  Input,
} from '@/components/common';
import { documentsApi, projectsApi } from '@/services/api';
import { formatRelativeTime, getStatusColor } from '@/lib/utils';
import type { Document, Project } from '@/types';

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'draft', label: 'Draft' },
  { value: 'in_review', label: 'In Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'archived', label: 'Archived' },
];

const FILE_TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'pdf', label: 'PDF' },
  { value: 'image', label: 'Image' },
  { value: 'json', label: 'JSON' },
  { value: 'text', label: 'Text' },
];


interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
}

function ConfirmationModal({ isOpen, onClose, onConfirm, title }: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Background Blur*/}
      <div
        className="absolute inset-0 bg-background/60 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />
      {/* Modal Card */}
      <Card className="relative w-full max-w-[400px] shadow-2xl border-destructive/20 animate-in fade-in zoom-in duration-300">
        <CardContent className="p-8">
          <div className="flex flex-col items-center text-center space-y-4">
            {/* Warning Icon*/}
            <div className="p-3 bg-destructive/10 rounded-full">
              <Trash2 className="h-6 w-6 text-destructive" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold tracking-tight">Confirm Deletion</h3>
              <p className="text-sm text-muted-foreground px-2">
                {title}
              </p>
            </div>
            <div className="flex w-full gap-4 pt-4">
              <Button
                variant="destructive"
                className="flex-1 font-semibold shadow-sm hover:shadow-destructive/20"
                onClick={onConfirm}
              >
                Yes
              </Button>
              <Button
                variant="outline"
                className="flex-1 font-semibold hover:bg-accent"
                onClick={onClose}
              >
                No
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
export function Documents() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  const projectFilter = searchParams.get('project') || '';
  const statusFilter = searchParams.get('status') || '';
  const fileTypeFilter = searchParams.get('file_type') || '';

  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list(),
  });

  const { data: documentsData, isLoading } = useQuery({
    queryKey: ['documents', projectFilter, statusFilter, fileTypeFilter],
    queryFn: () =>
      documentsApi.list({
        project: projectFilter || undefined,
        status: statusFilter || undefined,
        file_type: fileTypeFilter || undefined,
      }),
  });

  const projects = projectsData?.results || projectsData || [];
  const documents = documentsData?.results || documentsData || [];

  const filteredDocuments = documents.filter((doc: Document) =>
    doc.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const updateFilter = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
  };

  const clearFilters = () => {
    setSearchParams({});
    setSearchTerm('');
  };

  const hasActiveFilters = projectFilter || statusFilter || fileTypeFilter || searchTerm;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Documents</h1>
          <p className="text-muted-foreground">
            Manage all ground truth documents across projects
          </p>
        </div>
        <Link to="/projects">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Document
          </Button>
        </Link>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            {/* Search Bar */}
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search documents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
                <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </Button>
              {hasActiveFilters && (
                <Button variant="ghost" onClick={clearFilters}>
                  Clear
                </Button>
              )}
            </div>

            {/* Filter Options */}
            {showFilters && (
              <div className="flex flex-wrap gap-4 pt-4 border-t">
                {/* Project Filter */}
                <div className="space-y-1">
                  <label className="text-sm font-medium">Project</label>
                  <select
                    value={projectFilter}
                    onChange={(e) => updateFilter('project', e.target.value)}
                    className="flex h-10 w-48 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">All Projects</option>
                    {projects.map((project: Project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div className="space-y-1">
                  <label className="text-sm font-medium">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => updateFilter('status', e.target.value)}
                    className="flex h-10 w-40 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* File Type Filter */}
                <div className="space-y-1">
                  <label className="text-sm font-medium">File Type</label>
                  <select
                    value={fileTypeFilter}
                    onChange={(e) => updateFilter('file_type', e.target.value)}
                    className="flex h-10 w-40 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {FILE_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{documents.length}</div>
            <p className="text-sm text-muted-foreground">Total Documents</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">
              {documents.filter((d: Document) => d.status === 'draft').length}
            </div>
            <p className="text-sm text-muted-foreground">Draft</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {documents.filter((d: Document) => d.status === 'in_review').length}
            </div>
            <p className="text-sm text-muted-foreground">In Review</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {documents.filter((d: Document) => d.status === 'approved').length}
            </div>
            <p className="text-sm text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
      </div>

      {/* Documents Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filteredDocuments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left py-3 px-4 font-medium">Document</th>
                    <th className="w-10"></th>
                    <th className="text-left py-3 px-4 font-medium">Project</th>
                    <th className="text-left py-3 px-4 font-medium">Type</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-left py-3 px-4 font-medium">Updated</th>
                    <th className="text-left py-3 px-4 font-medium">Uploaded</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocuments.map((doc: Document) => (
                    <tr
                      key={doc.id}
                      className="border-b hover:bg-muted/50 cursor-pointer transition-colors group"
                      onClick={() => window.location.href = `/documents/${doc.id}`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <FileText className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium">{doc.name}</div>
                            {doc.description && (
                              <div className="text-sm text-muted-foreground truncate max-w-xs">
                                {doc.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      {/* Trash button for delete the documents*/}
                      <td className="py-3 px-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirm({ id: doc.id, name: doc.name });
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                      <td className="py-3 px-4">
                        <Link
                          to={`/projects/${doc.project}`}
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-2 text-sm hover:text-primary"
                        >
                          {doc.project_name || `Project ${doc.project}`}
                        </Link>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline">{doc.file_type}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(doc.status)}`}>
                          {doc.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-sm">
                        {formatRelativeTime(doc.updated_at)}
                      </td>
                      <td className="py-3 px-4 text-sm font-medium text-muted-foreground">
                        {doc.assigned_users && doc.assigned_users.length > 0
                          ? doc.assigned_users.map(u => u.full_name || u.username).join(', ')
                          : doc.created_by?.full_name || doc.created_by?.username || 'System'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No documents found</h3>
              <p className="text-muted-foreground mb-4">
                {hasActiveFilters
                  ? 'Try adjusting your filters'
                  : 'Create your first document to get started'}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      <ConfirmationModal
        isOpen={!!deleteConfirm}
        title={`Are you sure you want to delete "${deleteConfirm?.name}"? `}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={async () => {
          if (deleteConfirm) {
            try {
              await documentsApi.delete(deleteConfirm.id);
              setDeleteConfirm(null);
              queryClient.invalidateQueries({ queryKey: ['documents'] });
            } catch (error) {
              console.error("Delete failed:", error);
            }
          }
        }}
      />
    </div>
  );
}