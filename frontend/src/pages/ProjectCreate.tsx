import { useState, useEffect } from 'react';
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
  { value: 'client', label: 'Client' },
  { value: 'internal', label: 'Internal' },
  { value: 'content_creation', label: 'Content Creation' },
  { value: 'ideas', label: 'Ideas' },
];

const PROJECT_ROLES = [
  'Manager',
  'Frontend Developer',
  'Backend Developer',
  'Testing Engineer',
  'DevOps Engineer',
  'Social Media'
];


export function ProjectCreate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    task_type: 'key_value',
  });
  const [assignedTo, setAssignedTo] = useState<{ userId: number; role: string }[]>([]);
  const [activeRolePicker, setActiveRolePicker] = useState<number | null>(null);
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
    mutationFn: (data: typeof formData & { assigned_to: number[] }) => {
      return projectsApi.create(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['projects'],
        exact: false
      });
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

    const userIds = assignedTo.map(assignment => assignment.userId);
    createMutation.mutate({ ...formData, assigned_to: userIds });
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
    setAssignedTo(
      values.map(userId => ({
        userId,
        role: '',
      }))
    );
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // If the click is not inside the assigned-to container, close it
      if (!target.closest('.assigned-to-container')) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

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

            {/* Description Section */}
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

            {/* Assigned To - Repositioned and wrapped with container class */}
            <div className="relative space-y-2 assigned-to-container">
              <label className="text-sm font-medium">
                Assigned To <span className="text-destructive">*</span>
              </label>

              {/* Selection Trigger/Display Box */}
              <div
                className="w-full p-3 rounded-lg border border-input bg-background cursor-pointer flex flex-wrap gap-2 min-h-[50px] text-sm"
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                {assignedTo.length === 0 && (
                  <span className="text-muted-foreground">Select users...</span>
                )}
                {assignedTo.map((assignment) => {
                  const user = usersData?.find((u) => u.value === assignment.userId);
                  if (!user) return null;
                  return (
                    <Badge key={assignment.userId} variant="secondary" className="px-2 py-1 flex items-center gap-1">
                      {user.label} <span className="text-[10px] opacity-60">({assignment.role})</span>
                      <button
                        type="button"
                        className="ml-1 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAssignedTo(assignedTo.filter((a) => a.userId !== assignment.userId));
                        }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>

              {/* Main User List Dropdown */}
              {dropdownOpen && (
                <div className="absolute z-20 mt-1 w-full bg-popover border rounded-lg shadow-lg max-h-72 overflow-y-auto">
                  {usersData
                    ?.filter((user) => !assignedTo.some((a) => a.userId === user.value))
                    .map((user) => (
                      <div key={user.value} className="relative border-b last:border-0 p-2 hover:bg-accent/30">
                        <div className="flex items-center justify-between px-2">
                          <span className="text-sm font-medium">{user.label}</span>

                          {/* Role Selector Trigger */}
                          <div className="relative">
                            <button
                              type="button"
                              className="text-xs px-3 py-1.5 border rounded-md bg-background hover:bg-accent transition-colors flex items-center gap-2"
                              onClick={(e) => {
                                e.stopPropagation(); // Prevents main dropdown from closing
                                setActiveRolePicker(activeRolePicker === user.value ? null : user.value);
                              }}
                            >
                              {activeRolePicker === user.value ? 'Cancel' : 'Select Role'}
                              <svg className={`h-3 w-3 transition-transform ${activeRolePicker === user.value ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>

                            {/* Inline Role Dropdown */}
                            {activeRolePicker === user.value && (
                              <div className="absolute right-0 top-full mt-1 z-30 w-48 bg-background border rounded-md shadow-xl py-1">
                                {PROJECT_ROLES.map((role) => (
                                  <button
                                    key={role}
                                    type="button"
                                    className="w-full text-left px-3 py-2 text-xs hover:bg-primary hover:text-primary-foreground transition-colors"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setAssignedTo([...assignedTo, { userId: user.value, role }]);
                                      setActiveRolePicker(null);
                                      setDropdownOpen(false);
                                    }}
                                  >
                                    {role}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
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
