import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
  // { value: 'key_value', label: 'Key-Value Extraction' },
  // { value: 'table', label: 'Table Extraction' },
  // { value: 'classification', label: 'Document Classification' },
  // { value: 'ocr', label: 'OCR' },
  { value: 'client', label: 'Client' },
  { value: 'internal', label: 'Internal' },
  { value: 'content_creation', label: 'Content Creation' },
  { value: 'ideas', label: 'Ideas' },
];

export function ProjectCreate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    task_type: 'key_value',
  });
  const [assignedTo, setAssignedTo] = useState<number[]>([]);
  const [error, setError] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [taskTypeDropdownOpen, setTaskTypeDropdownOpen] = useState(false);
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['allUsers'],
    queryFn: usersApi.listAll,
    select: (data: AppUser[]) =>
      data.map((user) => ({
        value: user.id,
        label: user.first_name && user.last_name
          ? `${user.first_name} ${user.last_name}`
          : user.username,
      })),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof formData & { assigned_to: number[] }) =>
      projectsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
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

  //handler for the MultiSelect component
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Task Type*/}
              <div className="relative space-y-2">
                <label className="text-sm font-medium">
                  Task Type <span className="text-destructive">*</span>
                </label>

                <div
                  className="w-full p-3 rounded-lg border border-input bg-background cursor-pointer flex items-center justify-between min-h-[50px] text-sm"
                  onClick={() => setTaskTypeDropdownOpen(!taskTypeDropdownOpen)}
                >
                  <span className={formData.task_type ? "text-foreground" : "text-muted-foreground"}>
                    {TASK_TYPES.find(t => t.value === formData.task_type)?.label || "Select Task Type..."}
                  </span>
                  <svg
                    className={`h-4 w-4 text-muted-foreground transition-transform ${taskTypeDropdownOpen ? 'rotate-180' : ''}`}
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {taskTypeDropdownOpen && (
                  <div className="absolute z-30 mt-1 w-full bg-popover border rounded-lg shadow-lg max-h-56 overflow-y-auto">
                    {TASK_TYPES.map((type) => (
                      <div
                        key={type.value}
                        className={`px-4 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground flex justify-between ${formData.task_type === type.value ? "bg-accent/50" : ""
                          }`}
                        onClick={() => {
                          setFormData(prev => ({ ...prev, task_type: type.value }));
                          setTaskTypeDropdownOpen(false);
                        }}
                      >
                        <span>{type.label}</span>
                        {formData.task_type === type.value && <span className="text-primary font-bold">✓</span>}
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Select the type of extraction or classification task
                </p>
              </div>

              {/* Assigned To */}
              <div className="relative space-y-2">
                <label className="text-sm font-medium">
                  Assigned To <span className="text-destructive">*</span>
                </label>

                <div
                  className="w-full p-3 rounded-lg border border-input bg-background cursor-pointer flex flex-wrap gap-2 min-h-[50px] text-sm"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                  {assignedTo.length === 0 && (
                    <span className="text-muted-foreground">Select users...</span>
                  )}

                  {assignedTo.map((userId) => {
                    const user = usersData?.find((u) => u.value === userId);
                    if (!user) return null;

                    return (
                      <Badge
                        key={userId}
                        variant="secondary"
                        className="px-2 py-1 flex items-center gap-1"
                      >
                        {user.label}
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAssignedTo(assignedTo.filter((id) => id !== userId));
                          }}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>

                {dropdownOpen && (
                  <div className="absolute z-20 mt-1 w-full bg-popover border rounded-lg shadow-lg max-h-56 overflow-y-auto">
                    {usersData
                      ?.filter((user) => !assignedTo.includes(user.value))
                      .map((user) => (
                        <div
                          key={user.value}
                          className="px-4 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground flex justify-between"
                          onClick={() => {
                            setAssignedTo([...assignedTo, user.value]);
                            setDropdownOpen(false);
                          }}
                        >
                          <span>{user.label}</span>
                        </div>
                      ))}
                    {usersData?.filter((user) => !assignedTo.includes(user.value)).length === 0 && (
                      <div className="px-4 py-2 text-muted-foreground text-sm italic">
                        All users assigned
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
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
