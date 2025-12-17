import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Plus, Upload, Search, Film } from 'lucide-react';
import { projectsApi } from '@/services/api';
import { CreateTask } from '@/pages/MyTask/CreateTask';
import './ContentCreation.scss';

type TabType = 'tasks' | 'calendar' | 'media';
type StatusFilter = 'all' | 'todo' | 'draft' | 'inProgress' | 'inReview' | 'completed' | 'revisionNeeded';
type MediaTag = 'final' | 'draft' | 'rawFootage' | 'approved' | 'wip' | 'reference';

interface Task {
  id: string;
  title: string;
  status: StatusFilter;
  dueDate?: string;
  assignee?: string;
}

interface MediaFile {
  id: string;
  name: string;
  type: 'video' | 'image' | 'audio' | 'pdf';
  tags: MediaTag[];
  uploadedAt: string;
  size: string;
}

export function ContentCreation() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<TabType>('tasks');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMediaTags, setSelectedMediaTags] = useState<MediaTag[]>([]);
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.get(Number(id)),
    enabled: !!id,
  });

  // Mock data - replace with actual API calls
  const [tasks] = useState<Task[]>([]);
  const [mediaFiles] = useState<MediaFile[]>([]);

  const statusCounts = {
    all: tasks.length,
    todo: tasks.filter(t => t.status === 'todo').length,
    draft: tasks.filter(t => t.status === 'draft').length,
    inProgress: tasks.filter(t => t.status === 'inProgress').length,
    inReview: tasks.filter(t => t.status === 'inReview').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    revisionNeeded: tasks.filter(t => t.status === 'revisionNeeded').length,
  };

  const mediaTags: MediaTag[] = ['final', 'draft', 'rawFootage', 'approved', 'wip', 'reference'];

  const toggleMediaTag = (tag: MediaTag) => {
    setSelectedMediaTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const getStatusLabel = (status: StatusFilter): string => {
    const labels: Record<StatusFilter, string> = {
      all: 'All',
      todo: 'To-Do',
      draft: 'Draft',
      inProgress: 'In Progress',
      inReview: 'In Review',
      completed: 'Completed',
      revisionNeeded: 'Revision Needed'
    };
    return labels[status];
  };

  const getMediaTagLabel = (tag: MediaTag): string => {
    const labels: Record<MediaTag, string> = {
      final: 'Final',
      draft: 'Draft',
      rawFootage: 'Raw Footage',
      approved: 'Approved',
      wip: 'WIP',
      reference: 'Reference'
    };
    return labels[tag];
  };

  const handleTaskCreated = () => {
    setIsCreateTaskModalOpen(false);
    // Optionally refresh tasks list here
  };

  if (isLoading) {
    return (
      <div className="content-creation-loading">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="content-creation-error">
        <h2>Project not found</h2>
        <Link to="/projects">Back to projects</Link>
      </div>
    );
  }

  return (
    <div className="content-creation">
      {/* Main Content Area */}
      <div className="content-creation__main">
        {/* Header */}
        <div className="content-creation__header">
          <div className="content-creation__header-top">
            <Link to="/projects" className="content-creation__back-button">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="content-creation__title-section">
              <h1 className="content-creation__title">{project.name}</h1>
              <p className="content-creation__subtitle">Content Creation Dashboard</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="content-creation__tabs">
            <button
              className={`content-creation__tab ${activeTab === 'tasks' ? 'content-creation__tab--active' : ''}`}
              onClick={() => setActiveTab('tasks')}
            >
              Tasks
            </button>
            <button
              className={`content-creation__tab ${activeTab === 'calendar' ? 'content-creation__tab--active' : ''}`}
              onClick={() => setActiveTab('calendar')}
            >
              Calendar
            </button>
            <button
              className={`content-creation__tab ${activeTab === 'media' ? 'content-creation__tab--active' : ''}`}
              onClick={() => setActiveTab('media')}
            >
              Media
            </button>
            
            {/* Create Task Button */}
            <button
              className="content-creation__tab content-creation__tab--create-task"
              onClick={() => setIsCreateTaskModalOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Create Task
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="content-creation__content">
          {/* Tasks Tab */}
          {activeTab === 'tasks' && (
            <div className="content-creation__tasks">
              <div className="content-creation__tasks-empty">
                <div className="content-creation__empty-icon">📋</div>
                <h3>No tasks yet</h3>
                <p>Create your first content task to get started</p>
                <button 
                  className="content-creation__btn-primary"
                  onClick={() => setIsCreateTaskModalOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                  New Task
                </button>
              </div>
            </div>
          )}

          {/* Calendar Tab */}
          {activeTab === 'calendar' && (
            <div className="content-creation__calendar">
              <div className="content-creation__calendar-empty">
                <div className="content-creation__empty-icon">📅</div>
                <h3>Calendar View</h3>
                <p>Schedule and manage your content creation timeline</p>
                <button className="content-creation__btn-primary">
                  <Plus className="h-4 w-4" />
                  Add Event
                </button>
              </div>
            </div>
          )}

          {/* Media Tab */}
          {activeTab === 'media' && (
            <div className="content-creation__media">
              {/* Search Bar */}
              <div className="content-creation__search-bar">
                <Search className="content-creation__search-icon" />
                <input
                  type="text"
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="content-creation__search-input"
                />
              </div>

              {/* Upload Area */}
              <div className="content-creation__upload-area">
                <div className="content-creation__upload-box">
                  <Upload className="content-creation__upload-icon" />
                  <p className="content-creation__upload-text">Drop files here or click to browse</p>
                  <p className="content-creation__upload-subtext">Videos, images, audio, PDFs</p>
                </div>
              </div>

              {/* Empty State */}
              <div className="content-creation__media-empty">
                <Film className="content-creation__empty-media-icon" />
                <p className="content-creation__empty-text">No media files yet</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="content-creation__sidebar">
        {/* Filter by Status Section */}
        {activeTab === 'tasks' && (
          <div className="content-creation__sidebar-section">
            <h3 className="content-creation__sidebar-title">Filter by Status</h3>
            <div className="content-creation__sidebar-filters">
              {(['all', 'todo', 'draft', 'inProgress', 'inReview', 'completed', 'revisionNeeded'] as StatusFilter[]).map((status) => (
                <button
                  key={status}
                  className={`content-creation__sidebar-filter ${statusFilter === status ? 'content-creation__sidebar-filter--active' : ''}`}
                  onClick={() => setStatusFilter(status)}
                >
                  <span className="content-creation__sidebar-filter-label">
                    {getStatusLabel(status)}
                  </span>
                  <span className="content-creation__sidebar-filter-count">
                    {statusCounts[status]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Media Tags Section */}
        {activeTab === 'media' && (
          <div className="content-creation__sidebar-section">
            <h3 className="content-creation__sidebar-title">Media Tags</h3>
            <div className="content-creation__sidebar-filters">
              {mediaTags.map((tag) => (
                <button
                  key={tag}
                  className={`content-creation__sidebar-filter ${selectedMediaTags.includes(tag) ? 'content-creation__sidebar-filter--active' : ''}`}
                  onClick={() => toggleMediaTag(tag)}
                >
                  <span className="content-creation__sidebar-filter-label">
                    {getMediaTagLabel(tag)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create Task Modal */}
      {isCreateTaskModalOpen && (
        <div className="content-creation__modal-overlay">
          <div className="content-creation__modal-container">
            <CreateTask 
              onClose={() => setIsCreateTaskModalOpen(false)}
              onSuccess={handleTaskCreated}
              isModal={true}
            />
          </div>
        </div>
      )}
    </div>
  );
}