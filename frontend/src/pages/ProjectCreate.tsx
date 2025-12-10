import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, X } from 'lucide-react';
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
} from '@/components/common';
import { projectsApi, usersApi } from '@/services/api';
import type { User as AppUser } from '@/types';

interface MultiSelectProps {
  label: string;
  options: { value: number; label: string }[];
  selectedValues: number[];
  onChange: (values: number[]) => void;
  placeholder: string;
}

const MultiSelect: React.FC<MultiSelectProps> = ({
  label,
  options,
  selectedValues,
  onChange,
  placeholder,
}) => {
  const selectedLabels = options
    .filter((option) => selectedValues.includes(option.value))
    .map((option) => option.label);

  const availableOptions = options.filter(
    (option) => !selectedValues.includes(option.value)
  );

  const handleSelect = (value: number) => {
    onChange([...selectedValues, value]);
  };

  const handleDeselect = (value: number) => {
    onChange(selectedValues.filter((v) => v !== value));
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <div className="border border-input rounded-md p-2 min-h-[40px] flex flex-wrap gap-2 items-center">
        {selectedLabels.length === 0 && (
          <span className="text-muted-foreground text-sm">{placeholder}</span>
        )}
        {selectedValues.map((value) => {
          const labelText = options.find((opt) => opt.value === value)?.label || 'Unknown';
          return (
            <Badge key={value} className="flex items-center gap-1">
              {labelText}
              <button type="button" onClick={() => handleDeselect(value)} className="ml-1 text-xs">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          );
        })}

        <select
          className="flex-1 min-w-[100px] h-full bg-transparent text-sm focus:outline-none"
          value="" 
          onChange={(e) => handleSelect(Number(e.target.value))}
          disabled={availableOptions.length === 0}
        >
          <option value="" disabled>
            {availableOptions.length > 0 ? 'Select users...' : 'All users selected'}
          </option>
          {availableOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

const TASK_TYPES = [
  { value: 'key_value', label: 'Key-Value Extraction' },
  { value: 'table', label: 'Table Extraction' },
  { value: 'classification', label: 'Document Classification' },
  { value: 'ocr', label: 'OCR' },
  { value: 'ner', label: 'Named Entity Recognition' },
  { value: 'custom', label: 'Custom' },
];

export function ProjectCreate() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    task_type: 'key_value',
  });
  const [assignedTo, setAssignedTo] = useState<number[]>([]);
  const [error, setError] = useState('');
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['allUsers'],
    queryFn: usersApi.listAll,
    select: (data: AppUser[]) =>
      data.map((user) => ({
        value: user.id,
        label: user.username, 
      })),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof formData & { assigned_to: number[] }) => 
      projectsApi.create(data),
    onSuccess: () => {
      navigate('/projects');
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'Failed to create project');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Project name is required');
      return;
    }

    createMutation.mutate({ ...formData, assigned_to: assignedTo });
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  // New handler for the MultiSelect component
  const handleAssignedToChange = (values: number[]) => {
    setAssignedTo(values);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to="/projects"
          className="p-2 hover:bg-accent rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Create Project</h1>
          <p className="text-muted-foreground">
            Set up a new ground truth project
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

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
                placeholder="Describe the project purpose and scope"
                rows={4}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="task_type" className="text-sm font-medium">
                Task Type <span className="text-destructive">*</span>
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
              <p className="text-xs text-muted-foreground">
                Select the type of extraction or classification task
              </p>
            </div>
            {/* Assigned To Multi-select */}
            {usersLoading ? (
                <div className="space-y-2">
                    <label className="text-sm font-medium">Assigned To</label>
                    <Input placeholder="Loading users..." disabled />
                </div>
            ) : (
                <MultiSelect
                    label="Assigned To"
                    options={usersData || []}
                    selectedValues={assignedTo}
                    onChange={handleAssignedToChange}
                    placeholder="Select users to assign the project"
                />
            )}

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? 'Creating...' : 'Create Project'}
              </Button>
              <Link to="/projects">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
