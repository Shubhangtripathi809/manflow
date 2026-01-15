import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Save,
  Trash2,
  Plus,
  X,
  Users,
  Tags,
  Settings,
  AlertTriangle,
} from 'lucide-react';
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
} from '@/components/common';
import { projectsApi } from '@/services/api';
import type { Project, Label, TaskType } from '@/types';

const TASK_TYPES = [
  { value: 'client', label: 'Client' },
  { value: 'internal', label: 'Internal' },
  { value: 'content_creation', label: 'Content Creation' },
  { value: 'ideas', label: 'Ideas' },
];

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#10b981', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
];

export function ProjectSettings() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'general' | 'labels' | 'danger'>('general');
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    task_type: TaskType;
  }>({
    name: '',
    description: '',
    task_type: 'key_value' as TaskType,
  });
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [newLabel, setNewLabel] = useState({ name: '', color: '#3b82f6' });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.get((id!)),
    enabled: !!id,
  });

  // A boolean flag to handle initial form state loading safely
  const [isProjectDataLoaded, setIsProjectDataLoaded] = useState(false);

  // Logic to set form data once project loads
  if (project && !isProjectDataLoaded) {
    setFormData({
      name: project.name,
      description: project.description || '',
      task_type: project.task_type,
    });
    setIsProjectDataLoaded(true);
  }

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Project>) => projectsApi.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setIsFormDirty(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => projectsApi.delete(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      navigate('/projects');
    },
  });

  const createLabelMutation = useMutation({
    mutationFn: (data: { name: string; color: string }) =>
      projectsApi.createLabel(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      setNewLabel({ name: '', color: '#3b82f6' });
    },
  });

  const deleteLabelMutation = useMutation({
    mutationFn: (labelId: number) => projectsApi.deleteLabel(id!, labelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
    },
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    setIsFormDirty(true);
  };

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const handleCreateLabel = () => {
    if (newLabel.name.trim()) {
      createLabelMutation.mutate(newLabel);
    }
  };

  const handleDeleteProject = () => {
    deleteMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Project not found</h2>
        <Link to="/projects" className="text-primary hover:underline">
          Back to projects
        </Link>
      </div>
    );
  }

  const labels = project.labels || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to={`/projects/${id}`}
          className="p-2 hover:bg-accent rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Project Settings</h1>
          <p className="text-muted-foreground">{project?.name}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'general'
            ? 'border-primary text-primary'
            : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
        >
          <Settings className="h-4 w-4 inline mr-2" />
          General
        </button>
        <button
          onClick={() => setActiveTab('labels')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'labels'
            ? 'border-primary text-primary'
            : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
        >
          <Tags className="h-4 w-4 inline mr-2" />
          Labels ({labels.length})
        </button>
        <button
          onClick={() => setActiveTab('danger')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'danger'
            ? 'border-red-500 text-red-500'
            : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
        >
          <AlertTriangle className="h-4 w-4 inline mr-2" />
          Danger Zone
        </button>
      </div>

      {/* General Tab */}
      {activeTab === 'general' && (
        <Card>
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Project Name <span className="text-destructive">*</span>
              </label>
              <Input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter project name"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe the project"
                rows={4}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="task_type" className="text-sm font-medium">
                Task Type
              </label>
              <select
                id="task_type"
                name="task_type"
                value={formData.task_type}
                onChange={handleChange}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {TASK_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button
                onClick={handleSave}
                disabled={!isFormDirty || updateMutation.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
              {isFormDirty && (
                <Button
                  variant="outline"
                  onClick={() => {
                    if (project) {
                      setFormData({
                        name: project.name,
                        description: project.description || '',
                        task_type: project.task_type,
                      });
                    }
                    setIsFormDirty(false);
                  }}
                >
                  Cancel
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Labels Tab */}
      {activeTab === 'labels' && (
        <div className="space-y-6">
          {/* Create Label */}
          <Card>
            <CardHeader>
              <CardTitle>Create New Label</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 items-end">
                <div className="flex-1 space-y-2">
                  <label className="text-sm font-medium">Label Name</label>
                  <Input
                    value={newLabel.name}
                    onChange={(e) => setNewLabel((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., High Priority, Needs Review"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Color</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={newLabel.color}
                      onChange={(e) => setNewLabel((prev) => ({ ...prev, color: e.target.value }))}
                      className="w-10 h-10 rounded border cursor-pointer"
                    />
                    <div className="flex gap-1 flex-wrap max-w-48">
                      {PRESET_COLORS.slice(0, 8).map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setNewLabel((prev) => ({ ...prev, color }))}
                          className={`w-5 h-5 rounded ${newLabel.color === color ? 'ring-2 ring-offset-1 ring-primary' : ''}`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <Button
                  onClick={handleCreateLabel}
                  disabled={!newLabel.name.trim() || createLabelMutation.isPending}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Existing Labels */}
          <Card>
            <CardHeader>
              <CardTitle>Project Labels</CardTitle>
            </CardHeader>
            <CardContent>
              {labels.length > 0 ? (
                <div className="space-y-2">
                  {labels.map((label: Label) => (
                    <div
                      key={label.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: label.color }}
                        />
                        <span className="font-medium">{label.name}</span>
                        {label.description && (
                          <span className="text-sm text-muted-foreground">
                            {label.description}
                          </span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteLabelMutation.mutate(label.id)}
                        disabled={deleteLabelMutation.isPending}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Tags className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No labels created yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Danger Zone Tab */}
      {activeTab === 'danger' && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 border border-red-200 rounded-lg bg-red-50">
              <h4 className="font-medium text-red-800 mb-2">Delete Project</h4>
              <p className="text-sm text-red-600 mb-4">
                This will permanently delete the project, all documents, ground truth versions,
                and associated data. This action cannot be undone.
              </p>

              {!showDeleteConfirm ? (
                <Button
                  variant="outline"
                  className="border-red-300 text-red-600 hover:bg-red-100"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Project
                </Button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-red-800">
                    Are you sure? Type "{project.name}" to confirm.
                  </p>
                  <div className="flex gap-3">
                    <Input
                      placeholder="Type project name to confirm"
                      id="confirm-delete"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                    />
                    <Button
                      variant="destructive"
                      onClick={handleDeleteProject}
                      disabled={deleteMutation.isPending || deleteConfirmText !== project.name}
                    >
                      {deleteMutation.isPending ? 'Deleting...' : 'Confirm Delete'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setDeleteConfirmText('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}