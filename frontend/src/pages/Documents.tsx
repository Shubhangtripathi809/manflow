import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { FileText, Search, Filter, ChevronDown } from 'lucide-react';
import { Button, Card, CardContent, Badge, Input } from '@/components/common';
import { documentsApi, projectsApi } from '@/services/api';
import type { Document, Project } from '@/types';
import {
  ViewToggle,
  DualView,
  useViewMode,
} from '@/components/layout/DualView';
import {
  createDocumentsTableColumns,
  DocumentGridCard,
} from '@/components/layout/DualView/documentsConfig';

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

function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-background/60 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />
      <Card className="relative w-full max-w-[400px] shadow-2xl border-destructive/20 animate-in fade-in zoom-in duration-300">
        <CardContent className="p-8">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-3 bg-destructive/10 rounded-full">
              <FileText className="h-6 w-6 text-destructive" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold tracking-tight">
                Confirm Deletion
              </h3>
              <p className="text-sm text-muted-foreground px-2">{title}</p>
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
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const { viewMode, setViewMode } = useViewMode({
    defaultMode: 'table',
    storageKey: 'documents-view-mode',
  });

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
        project: projectFilter ? Number(projectFilter) : undefined,
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

  const hasActiveFilters =
    projectFilter || statusFilter || fileTypeFilter || searchTerm;

  const handleDeleteClick = (e: React.MouseEvent, doc: Document) => {
    e.stopPropagation();
    setDeleteConfirm({ id: doc.id, name: doc.name });
  };

  const emptyState = (
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
  );

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
        <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
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
                <ChevronDown
                  className={`h-4 w-4 ml-2 transition-transform ${
                    showFilters ? 'rotate-180' : ''
                  }`}
                />
              </Button>
              {hasActiveFilters && (
                <Button variant="ghost" onClick={clearFilters}>
                  Clear
                </Button>
              )}
            </div>

            {showFilters && (
              <div className="flex flex-wrap gap-4 pt-4 border-t">
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
              {
                documents.filter((d: Document) => d.status === 'in_review')
                  .length
              }
            </div>
            <p className="text-sm text-muted-foreground">In Review</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {
                documents.filter((d: Document) => d.status === 'approved')
                  .length
              }
            </div>
            <p className="text-sm text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
      </div>

      {/* Documents View */}
      <DualView
        viewMode={viewMode}
        isLoading={isLoading}
        gridProps={{
          data: filteredDocuments,
          renderCard: (doc) => (
            <DocumentGridCard
              key={doc.id}
              document={doc}
              onDeleteClick={handleDeleteClick}
            />
          ),
          emptyState,
          gridClassName: 'grid gap-4 md:grid-cols-2 lg:grid-cols-3',
        }}
        tableProps={{
          data: filteredDocuments,
          columns: createDocumentsTableColumns({ onDeleteClick: handleDeleteClick }),
          rowKey: (doc) => doc.id,
          onRowClick: (doc) => (window.location.href = `/documents/${doc.id}`),
          emptyState,
          rowClassName: () => 'group',
        }}
      />

      <ConfirmationModal
        isOpen={!!deleteConfirm}
        title={`Are you sure you want to delete "${deleteConfirm?.name}"?`}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={async () => {
          if (deleteConfirm) {
            try {
              await documentsApi.delete(deleteConfirm.id);
              setDeleteConfirm(null);
              queryClient.invalidateQueries({ queryKey: ['documents'] });
            } catch (error) {
              console.error('Delete failed:', error);
            }
          }
        }}
      />
    </div>
  );
}
