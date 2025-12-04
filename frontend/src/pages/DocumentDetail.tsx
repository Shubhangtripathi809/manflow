import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Save,
  Send,
  CheckCircle,
  History,
  FileText,
  Download,
  Plus,
} from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
} from '@/components/common';
import { documentsApi, projectsApi } from '@/services/api';
import { formatDate, formatDateTime, getStatusColor } from '@/lib/utils';
import type { Document, GTVersion } from '@/types';
import { DiffViewer } from '@/components/DiffViewer';
import { LabelSelector } from '@/components/LabelSelector';

function SourcePreview({ doc }: { doc: Document }) {
  if (!doc.source_file) {
    return (
      <div className="aspect-[3/4] bg-muted rounded-lg flex items-center justify-center">
        <p className="text-sm text-muted-foreground">No source file</p>
      </div>
    );
  }

  if (doc.file_type === 'image') {
    return (
      <img
        src={doc.source_file}
        alt={doc.name}
        className="w-full rounded-lg border"
      />
    );
  }

  if (doc.file_type === 'pdf') {
    return (
      <div className="aspect-[3/4] bg-muted rounded-lg flex items-center justify-center">
        <a
          href={doc.source_file}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          View PDF
        </a>
      </div>
    );
  }

  return (
    <div className="p-4 bg-muted rounded-lg">
      <p className="text-sm text-muted-foreground">
        Preview not available for this file type
      </p>
    </div>
  );
}

export function DocumentDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [gtData, setGtData] = useState<string>('');
  const [changeSummary, setChangeSummary] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [jsonError, setJsonError] = useState('');
  const [activeTab, setActiveTab] = useState<'editor' | 'versions'>('editor');
  const [compareMode, setCompareMode] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<GTVersion | null>(null);

  const { data: document, isLoading } = useQuery({
    queryKey: ['document', id],
    queryFn: () => documentsApi.get(id!),
    enabled: !!id,
  });

  const { data: versions } = useQuery({
    queryKey: ['document-versions', id],
    queryFn: () => documentsApi.getVersions(id!),
    enabled: !!id,
  });

  const { data: project } = useQuery({
    queryKey: ['project', document?.project],
    queryFn: () => projectsApi.get(Number(document?.project)),
    enabled: !!document?.project,
  });

  useEffect(() => {
    if (document?.current_gt_version?.gt_data) {
      setGtData(JSON.stringify(document.current_gt_version.gt_data, null, 2));
    }
  }, [document]);

  const createVersionMutation = useMutation({
    mutationFn: (data: { gt_data: Record<string, unknown>; change_summary?: string }) =>
      documentsApi.createVersion(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document', id] });
      queryClient.invalidateQueries({ queryKey: ['document-versions', id] });
      setIsEditing(false);
      setChangeSummary('');
    },
  });

  const submitForReviewMutation = useMutation({
    mutationFn: () => documentsApi.submitForReview(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document', id] });
    },
  });

  const approveMutation = useMutation({
    mutationFn: () => documentsApi.approve(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document', id] });
    },
  });

  const handleSaveVersion = () => {
    setJsonError('');
    try {
      const parsedData = JSON.parse(gtData);
      createVersionMutation.mutate({
        gt_data: parsedData,
        change_summary: changeSummary,
      });
    } catch {
      setJsonError('Invalid JSON format');
    }
  };

  const handleGtChange = (value: string) => {
    setGtData(value);
    setJsonError('');
    if (value.trim()) {
      try {
        JSON.parse(value);
      } catch {
        setJsonError('Invalid JSON');
      }
    }
  };

  const loadVersion = (version: GTVersion) => {
    setGtData(JSON.stringify(version.gt_data, null, 2));
    setIsEditing(true);
    setActiveTab('editor');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!document) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Document not found</h2>
        <Link to="/projects" className="text-primary hover:underline">
          Back to projects
        </Link>
      </div>
    );
  }

  const versionList = versions?.results || versions || [];
  const doc = document as Document;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link
            to={`/projects/${doc.project}`}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{doc.name}</h1>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(doc.status)}`}>
                {doc.status.replace('_', ' ')}
              </span>
            </div>
            {doc.description && (
              <p className="text-muted-foreground mt-1">{doc.description}</p>
            )}
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span>Type: {doc.file_type}</span>
              <span>Versions: {doc.version_count || 0}</span>
              <span>Created: {formatDate(doc.created_at)}</span>
            </div>
            {/* Labels */}
            <div className="mt-3">
              <LabelSelector
                documentId={doc.id}
                currentLabels={doc.labels || []}
                availableLabels={project?.labels || []}
              />
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {doc.source_file && (
            <a href={doc.source_file} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </a>
          )}
          {doc.status === 'draft' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => submitForReviewMutation.mutate()}
              disabled={submitForReviewMutation.isPending}
            >
              <Send className="h-4 w-4 mr-2" />
              Submit for Review
            </Button>
          )}
          {doc.status === 'in_review' && (
            <Button
              size="sm"
              onClick={() => approveMutation.mutate()}
              disabled={approveMutation.isPending}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('editor')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'editor'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileText className="h-4 w-4 inline mr-2" />
          GT Editor
        </button>
        <button
          onClick={() => setActiveTab('versions')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'versions'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <History className="h-4 w-4 inline mr-2" />
          Version History ({versionList.length})
        </button>
      </div>

      {activeTab === 'editor' && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Source File</CardTitle>
            </CardHeader>
            <CardContent>
              <SourcePreview doc={doc} />
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Ground Truth Data</CardTitle>
              {!isEditing && doc.current_gt_version && (
                <Badge variant="outline">v{doc.current_gt_version.version_number}</Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {jsonError && (
                <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  {jsonError}
                </div>
              )}

              <textarea
                value={gtData}
                onChange={(e) => handleGtChange(e.target.value)}
                onFocus={() => setIsEditing(true)}
                placeholder='{"key": "value"}'
                rows={16}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />

              {isEditing && (
                <div className="space-y-4 pt-2 border-t">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Change Summary</label>
                    <input
                      type="text"
                      value={changeSummary}
                      onChange={(e) => setChangeSummary(e.target.value)}
                      placeholder="Describe your changes..."
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSaveVersion}
                      disabled={!!jsonError || createVersionMutation.isPending}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {createVersionMutation.isPending ? 'Saving...' : 'Save New Version'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsEditing(false);
                        if (doc.current_gt_version?.gt_data) {
                          setGtData(JSON.stringify(doc.current_gt_version.gt_data, null, 2));
                        }
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {!isEditing && !doc.current_gt_version && (
                <div className="text-center py-8 border-t">
                  <p className="text-muted-foreground mb-4">No ground truth data yet</p>
                  <Button onClick={() => setIsEditing(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Ground Truth
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'versions' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Version History</CardTitle>
            {versionList.length >= 2 && (
              <Button
                variant={compareMode ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setCompareMode(!compareMode);
                  setSelectedVersion(null);
                }}
              >
                {compareMode ? 'Exit Compare' : 'Compare Versions'}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {compareMode && selectedVersion && doc.current_gt_version && (
              <div className="mb-6 p-4 border rounded-lg bg-muted/30">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium">
                    Comparing v{selectedVersion.version_number} → v{doc.current_gt_version.version_number}
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedVersion(null)}
                  >
                    Clear
                  </Button>
                </div>
                <DiffViewer
                  oldData={selectedVersion.gt_data as Record<string, unknown>}
                  newData={doc.current_gt_version.gt_data as Record<string, unknown>}
                  oldLabel={`v${selectedVersion.version_number}`}
                  newLabel={`v${doc.current_gt_version.version_number} (Current)`}
                />
              </div>
            )}

            {compareMode && !selectedVersion && (
              <div className="mb-6 p-4 border rounded-lg bg-blue-50 text-blue-800 text-sm">
                Select a version below to compare with the current version
              </div>
            )}

            {versionList.length > 0 ? (
              <div className="space-y-4">
                {versionList.map((version: GTVersion) => (
                  <div
                    key={version.id}
                    className={`flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 ${
                      selectedVersion?.id === version.id ? 'ring-2 ring-primary' : ''
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold">
                        v{version.version_number}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Version {version.version_number}</span>
                          {version.is_approved && (
                            <Badge className="bg-green-100 text-green-800">Approved</Badge>
                          )}
                          {doc.current_gt_version?.id === version.id && (
                            <Badge variant="secondary">Current</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {version.change_summary || 'No description'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          By {version.created_by?.full_name || version.created_by?.username || 'Unknown'} - {formatDateTime(version.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {compareMode && doc.current_gt_version?.id !== version.id && (
                        <Button
                          variant={selectedVersion?.id === version.id ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSelectedVersion(
                            selectedVersion?.id === version.id ? null : version
                          )}
                        >
                          {selectedVersion?.id === version.id ? 'Selected' : 'Compare'}
                        </Button>
                      )}
                      {!compareMode && (
                        <Button variant="outline" size="sm" onClick={() => loadVersion(version)}>
                          Load
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No versions yet</h3>
                <p className="text-muted-foreground">Create your first ground truth version</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}