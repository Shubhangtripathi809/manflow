import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Table, FileSpreadsheet } from 'lucide-react';
import './Tools.scss';

export function PivotTableExtractor() {
  const navigate = useNavigate();
  const [leftFile, setLeftFile] = useState<File | null>(null);
  const [rightFile, setRightFile] = useState<File | null>(null);

  const handleLeftUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLeftFile(file);
    }
  };

  const handleRightUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setRightFile(file);
    }
  };

  return (
    <div className="tool-viewer">
      <aside className="tool-viewer-sidebar">
        <div className="sidebar-header">
          <h2>Tools Hub</h2>
          <p>Manage your utilities</p>
        </div>
        <button className="back-button" onClick={() => navigate('/tools')}>
          <ArrowLeft size={18} />
          <span>Back to Tools</span>
        </button>
      </aside>

      <div className="viewer-content">
        <div className="viewer-header">
          <h1>Pivot Table Extractor</h1>
        </div>

        <div className="viewer-main">
          <div className="viewer-panel">
            <div className="panel-header">
              <Table size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
              Source Data
            </div>
            <div className="panel-content">
              {!leftFile ? (
                <label className="upload-area">
                  <Upload size={48} />
                  <p>Upload Data File</p>
                  <p>Click to browse or drag and drop (CSV, Excel)</p>
                  <input 
                    type="file" 
                    accept=".csv,.xlsx,.xls" 
                    onChange={handleLeftUpload} 
                  />
                </label>
              ) : (
                <div>
                  <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '0.5rem' }}>
                    <strong>File:</strong> {leftFile.name}
                  </div>
                  <div style={{ 
                    padding: '2rem', 
                    background: '#f8fafc', 
                    borderRadius: '0.5rem',
                    border: '1px solid #e2e8f0',
                    textAlign: 'center',
                    color: '#64748b'
                  }}>
                    <FileSpreadsheet size={48} style={{ margin: '0 auto 1rem' }} />
                    <p>File loaded successfully</p>
                    <p style={{ fontSize: '0.875rem' }}>Preview functionality coming soon</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="viewer-panel">
            <div className="panel-header">
              <Table size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
              Extracted Pivot Table
            </div>
            <div className="panel-content">
              {!rightFile ? (
                <label className="upload-area">
                  <Upload size={48} />
                  <p>Upload Comparison File</p>
                  <p>Click to browse or drag and drop (CSV, Excel)</p>
                  <input 
                    type="file" 
                    accept=".csv,.xlsx,.xls" 
                    onChange={handleRightUpload} 
                  />
                </label>
              ) : (
                <div>
                  <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '0.5rem' }}>
                    <strong>File:</strong> {rightFile.name}
                  </div>
                  <div style={{ 
                    padding: '2rem', 
                    background: '#f8fafc', 
                    borderRadius: '0.5rem',
                    border: '1px solid #e2e8f0',
                    textAlign: 'center',
                    color: '#64748b'
                  }}>
                    <FileSpreadsheet size={48} style={{ margin: '0 auto 1rem' }} />
                    <p>File loaded successfully</p>
                    <p style={{ fontSize: '0.875rem' }}>Preview functionality coming soon</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}