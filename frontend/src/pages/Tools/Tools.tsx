import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Type, Braces, Table, Grid3x3, List, ArrowLeft } from 'lucide-react';
import './Tools.scss';

interface Tool {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  path: string;
  category: string;
  color: string;
}

const tools: Tool[] = [
  {
    id: 'pdf-vs-html',
    name: 'PDF vs HTML Viewer',
    description: 'Compare PDF and HTML side-by-side',
    icon: FileText,
    path: '/tools/pdf-vs-html',
    category: 'Viewers',
    color: 'bg-blue-500'
  },
  {
    id: 'superscript-checker',
    name: 'Superscript Checker',
    description: 'Verify superscript and indentation formatting',
    icon: Type,
    path: '/tools/superscript-checker',
    category: 'Text Tools',
    color: 'bg-green-500'
  },
  {
    id: 'json-viewer',
    name: 'JSON Viewer',
    description: 'View and format JSON data',
    icon: Braces,
    path: '/tools/json-viewer',
    category: 'Viewers',
    color: 'bg-purple-500'
  },
  {
    id: 'pivot-table',
    name: 'Pivot Table Extractor',
    description: 'Extract and analyze pivot table data',
    icon: Table,
    path: '/tools/pivot-table',
    category: 'Data Tools',
    color: 'bg-orange-500'
  }
];

export function ToolsHub() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = ['all', 'Viewers', 'Text Tools', 'Data Tools'];

  const filteredTools = tools.filter(tool => {
    const matchesSearch = tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         tool.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || tool.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="tools-hub">
      {/* Left Sidebar */}
      <aside className="tools-sidebar">
        <div className="sidebar-header">
          <div className="header-content">
            <button className="back-arrow" onClick={() => navigate('/')}>
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2>Tools Hub</h2>
              <p>Manage your utilities</p>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-item active">
            <FileText size={20} />
            <span>Tools Hub</span>
          </div>

          <div className="nav-section">
            <div className="nav-section-title">VIEWERS</div>
            <div className="nav-item" onClick={() => navigate('/tools/pdf-vs-html')}>
              <FileText size={18} />
              <span>PDF vs HTML Viewer</span>
            </div>
            <div className="nav-item" onClick={() => navigate('/tools/json-viewer')}>
              <Braces size={18} />
              <span>JSON Viewer</span>
            </div>
          </div>

          <div className="nav-section">
            <div className="nav-section-title">TEXT TOOLS</div>
            <div className="nav-item" onClick={() => navigate('/tools/superscript-checker')}>
              <Type size={18} />
              <span>Superscript Checker</span>
            </div>
          </div>

          <div className="nav-section">
            <div className="nav-section-title">DATA TOOLS</div>
            <div className="nav-item" onClick={() => navigate('/tools/pivot-table')}>
              <Table size={18} />
              <span>Pivot Table Extractor</span>
            </div>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="tools-main">
        <div className="tools-header">
          <div>
            <h1>Tools Hub</h1>
            <p>Select a tool to get started</p>
          </div>
          
          <div className="view-toggle">
            <button
              className={viewMode === 'grid' ? 'active' : ''}
              onClick={() => setViewMode('grid')}
            >
              <Grid3x3 size={20} />
            </button>
            <button
              className={viewMode === 'list' ? 'active' : ''}
              onClick={() => setViewMode('list')}
            >
              <List size={20} />
            </button>
          </div>
        </div>

        <div className={`tools-grid ${viewMode}`}>
          {filteredTools.map((tool) => (
            <div
              key={tool.id}
              className="tool-card"
              onClick={() => navigate(tool.path)}
            >
              <div className={`tool-icon ${tool.color}`}>
                <tool.icon size={32} />
              </div>
              <div className="tool-content">
                <h3>{tool.name}</h3>
                <p>{tool.description}</p>
                <span className="tool-category">{tool.category}</span>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}