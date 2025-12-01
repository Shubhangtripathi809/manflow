import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Upload, File, X } from 'lucide-react';
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/common';
import { documentsApi, projectsApi } from '@/services/api';

const FILE_TYPES = [
    { value: 'json', label: 'JSON' },
    { value: 'pdf', label: 'PDF' },
    { value: 'image', label: 'Image' },
    { value: 'text', label: 'Text' },
    { value: 'other', label: 'Other' },
];

export function DocumentCreate() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    file_type: 'pdf',
  });
  const [file, setFile] = useState<File | null>(null);
  const [initialGT, setInitialGT] = useState('');
  const [error, setError] = useState('');

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.get(Number(projectId)),
    enabled: !!projectId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return documentsApi.create(data);
    },
    onSuccess: () => {
      navigate(`/projects/${projectId}`);
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'Failed to create document');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Document name is required');
      return;
    }

    const data = new FormData();
    data.append('project', projectId || '');
    data.append('name', formData.name);
    data.append('description', formData.description);
    data.append('file_type', formData.file_type);
    
    if (file) {
      data.append('source_file', file);
    }

    if (initialGT.trim()) {
      try {
        const gtData = JSON.parse(initialGT);
        data.append('initial_gt_data', JSON.stringify(gtData));
      } catch {
        setError('Invalid JSON format for ground truth data');
        return;
      }
    }

    createMutation.mutate(data);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      // Auto-fill name if empty
      if (!formData.name) {
        setFormData((prev) => ({
          ...prev,
          name: selectedFile.name.replace(/\.[^/.]+$/, ''),
        }));
      }
      // Auto-detect file type
      const ext = selectedFile.name.split('.').pop()?.toLowerCase();
      if (ext === 'pdf') {
        setFormData((prev) => ({ ...prev, file_type: 'pdf' }));
      } else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
        setFormData((prev) => ({ ...prev, file_type: 'image' }));
      } else if (ext === 'json') {
        setFormData((prev) => ({ ...prev, file_type: 'json' }));
      } else if (ext === 'txt') {
        setFormData((prev) => ({ ...prev, file_type: 'text' }));
      }
    }
  };

  const removeFile = () => {
    setFile(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to={`/projects/${projectId}`}
          className="p-2 hover:bg-accent rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Add Document</h1>
          <p className="text-muted-foreground">
            {project?.name ? `Add document to ${project.name}` : 'Upload a new document'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* File Upload */}
        <Card>
          <CardHeader>
            <CardTitle>Source File</CardTitle>
          </CardHeader>
          <CardContent>
            {!file ? (
              <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="mb-2 text-sm text-muted-foreground">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PDF, PNG, JPG, JSON, TXT (MAX. 50MB)
                  </p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                  accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.json,.txt"
                />
              </label>
            ) : (
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  <File className="h-8 w-8 text-primary" />
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={removeFile}
                  className="p-2 hover:bg-accent rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Document Details */}
        <Card>
          <CardHeader>
            <CardTitle>Document Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Document Name <span className="text-destructive">*</span>
              </label>
              <Input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter document name"
                required
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
                placeholder="Optional description"
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="file_type" className="text-sm font-medium">
                File Type
              </label>
              <select
                id="file_type"
                name="file_type"
                value={formData.file_type}
                onChange={handleChange}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {FILE_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Initial Ground Truth */}
        <Card>
          <CardHeader>
            <CardTitle>Initial Ground Truth (Optional)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <label htmlFor="initial_gt" className="text-sm font-medium">
                Ground Truth JSON
              </label>
              <textarea
                id="initial_gt"
                value={initialGT}
                onChange={(e) => setInitialGT(e.target.value)}
                placeholder='{"field1": "value1", "field2": "value2"}'
                rows={8}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              <p className="text-xs text-muted-foreground">
                Enter valid JSON for the ground truth data. You can also add/edit this later.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creating...' : 'Create Document'}
          </Button>
          <Link to={`/projects/${projectId}`}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}