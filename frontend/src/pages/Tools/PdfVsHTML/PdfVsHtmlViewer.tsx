import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ChevronLeft, ChevronRight, Edit3, Undo, Trash2, Filter, Database,
  FileText, ZoomIn, ZoomOut
} from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import type { StyleCounts, GroundTruthEntry, Highlight } from '@/types';
import { toolApi } from '@/services/api';
import './PdfVsHtmlViewer.scss';

// Set PDF worker source globally
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const ISSUE_TYPES = [
  'Incorrect Styling',
  'Missing Content',
  'Extra Content',
  'Table Issue',
  'Normalization Error',
  'Font Issue',
  'Other',
];

// Replicated logic from useInitialData GroundTruthPanel
const useInitialData = (
  setEntries: React.Dispatch<React.SetStateAction<GroundTruthEntry[]>>,
  setProjectList: React.Dispatch<React.SetStateAction<string[]>>
) => {
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;

    const fetchInitialData = async () => {
      try {
        // 1. Fetch all available project folders
        const projectsData = await toolApi.getProjectFolders();
        setProjectList(projectsData);

        // 2. Fetch all existing ground truth entries
        const gtData = await toolApi.getAllGroundTruth();
        setEntries(gtData);

        hasFetched.current = true;
      } catch (err) {
        console.error("Error fetching initial data:", err);
      }
    };

    fetchInitialData();
  }, [setEntries, setProjectList]);
};

// Replicated logic from useHighlights.ts
const useHighlightsLogic = () => {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [isHighlightMode, setIsHighlightMode] = useState(false);

  const addHighlight = useCallback((highlight: Omit<Highlight, 'id'>) => {
    const newHighlight: Highlight = {
      ...highlight,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
    };
    setHighlights(prev => [...prev, newHighlight]);
  }, []);

  const removeLastHighlight = useCallback(() => {
    setHighlights(prev => prev.slice(0, -1));
  }, []);

  const clearAllHighlights = useCallback(() => {
    setHighlights([]);
  }, []);

  const toggleHighlightMode = useCallback(() => {
    setIsHighlightMode(prev => !prev);
  }, []);

  return {
    highlights,
    isHighlightMode,
    addHighlight,
    removeLastHighlight,
    clearAllHighlights,
    toggleHighlightMode,
    canUndo: highlights.length > 0
  };
};

// --- [ GROUND TRUTH PANEL COMPONENT ] ---

interface GroundTruthPanelProps {
  currentPage: number;
  onClose: () => void;
  entries: GroundTruthEntry[];
  setEntries: React.Dispatch<React.SetStateAction<GroundTruthEntry[]>>;
  currentDocName: string;
}

const GroundTruthPanel: React.FC<GroundTruthPanelProps> = ({ currentPage, onClose, entries, setEntries, currentDocName }) => {
  const [view, setView] = useState<'create' | 'viewCurrent' | 'viewAll'>('create');
  const [issueType, setIssueType] = useState(ISSUE_TYPES[0]);
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    // Debounce adding listener to avoid instant close on button click
    setTimeout(() => document.addEventListener('mousedown', handleClickOutside), 0);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError('Please fill in this field.');
      return;
    }

    if (!currentDocName) {
      setError('Document name is missing. Cannot submit entry.');
      return;
    }
    const docName = currentDocName.replace(/\.html$/, '').replace(/\.pdf$/, '');
    const newEntryPayload = {
      pageNumber: currentPage,
      issueType,
      location: location.trim() || 'N/A',
      description: description.trim(),
    };

    try {
      await toolApi.submitGroundTruth(docName, newEntryPayload);
      const updatedGtEntries = await toolApi.getAllGroundTruth();
      setEntries(updatedGtEntries);
      setLocation('');
      setDescription('');
      setError('');
      setView('viewCurrent');

    } catch (err) {
      console.error("Error submitting ground truth entry:", err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    }
  };

  const pageEntries = entries.filter(entry => entry.pageNumber === currentPage);

  return (
    <div className="gt-panel-card" ref={panelRef}>
      <div className="gt-panel-card__nav">
        <button onClick={() => setView('viewCurrent')} className={`nav-button ${view === 'viewCurrent' ? 'active' : ''}`}>
          Page Entries ({pageEntries.length})
        </button>
        <button onClick={() => setView('viewAll')} className={`nav-button ${view === 'viewAll' ? 'active' : ''}`}>
          All Entries ({entries.length})
        </button>
        <button onClick={() => setView('create')} className={`nav-button ${view === 'create' ? 'active' : ''}`}>
          + Create New Entry
        </button>
      </div>

      {view === 'create' && (
        <div className="gt-panel-card__content">
          <div className="gt-panel-card__header">
            <h3 className="gt-panel-card__title">Create Ground Truth Entry</h3>
            <p className="gt-panel-card__subtitle">Found an issue on Page {currentPage}? Use this form to report it.</p>
          </div>
          <form onSubmit={handleSubmit} className="gt-panel-card__form" noValidate>
            <div className="form-group">
              <label htmlFor="issueType">Type of Issue</label>
              <select id="issueType" value={issueType} onChange={(e) => setIssueType(e.target.value)} className="form-control">
                {ISSUE_TYPES.map(type => (<option key={type} value={type}>{type}</option>))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="location">Location (Optional)</label>
              <input type="text" id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g., Paragraph 3, second sentence" className="form-control" />
            </div>
            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea id="description" value={description} onChange={(e) => { setDescription(e.target.value); if (error) setError(''); }} placeholder="Describe the issue in detail..." className={`form-control ${error ? 'is-invalid' : ''}`} rows={5} />
              {error && <small className="error-text" style={{ color: '#dc2626' }}>{error}</small>}
            </div>
            <button type="submit" className="submit-button">Submit Entry</button>
          </form>
        </div>
      )}

      {view === 'viewCurrent' && (
        <div className="gt-panel-card__content">
          <div className="gt-panel-card__header">
            <h3 className="gt-panel-card__title">Submitted Ground Truth Entries</h3>
            <p className="gt-panel-card__subtitle">A total of {pageEntries.length} issue(s) have been reported for page {currentPage}.</p>
          </div>
          <div className="gt-panel-card__view-area">
            {pageEntries.length === 0 ? (
              <div className="empty-state">
                <p>No entries have been submitted yet.</p>
                <button onClick={() => setView('create')} className="submit-button">Create Your First Entry</button>
              </div>
            ) : (
              <ul className="entry-list">
                {pageEntries.map(entry => (
                  <li key={entry.id} className="entry-item">
                    <strong className="entry-item__type">{entry.issueType}</strong>
                    <p className="entry-item__desc">{entry.description}</p>
                    <small className="entry-item__loc">Location: {entry.location}</small>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {view === 'viewAll' && (
        <div className="gt-panel-card__content">
          <div className="gt-panel-card__header">
            <h3 className="gt-panel-card__title">All Submitted Entries</h3>
            <p className="gt-panel-card__subtitle">A total of {entries.length} issue(s) have been reported across all pages.</p>
          </div>
          <div className="gt-panel-card__view-area">
            {entries.length === 0 ? (
              <div className="empty-state">
                <p>No entries have been submitted yet.</p>
                <button onClick={() => setView('create')} className="submit-button">Create Your First Entry</button>
              </div>
            ) : (
              <ul className="entry-list">
                {entries.map(entry => (
                  <li key={entry.id} className="entry-item">
                    <div className="entry-item__header">
                      <strong className="entry-item__type">{entry.issueType}</strong>
                      <span className="entry-item__page">Page: {entry.pageNumber}</span>
                    </div>
                    <p className="entry-item__desc">{entry.description}</p>
                    <small className="entry-item__loc">Location: {entry.location}</small>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};


// --- [ PDF NAV COMPONENT ] ---

interface PdfNavProps {
  scale: number;
  onScaleChange: (scale: number) => void;
  onReset: () => void;
}

const PdfNav: React.FC<PdfNavProps> = ({ scale, onScaleChange, onReset }) => {
  const handleZoomIn = () => {
    onScaleChange(Math.min(scale + 0.25, 3.0));
  };

  const handleZoomOut = () => {
    onScaleChange(Math.max(scale - 0.25, 0.5));
  };

  return (
    <div className="pdf-nav">
      {/* Left: Empty (for space-between) */}
      <div className="pdf-nav__left">
      </div>

      {/* Center: Zoom Controls */}
      <div className="pdf-nav__center">
        <button
          onClick={handleZoomOut}
          disabled={scale <= 0.5}
          className="pdf-nav__button"
          title="Zoom Out"
        >
          <ZoomOut size={16} />
        </button>

        <span className="pdf-nav__scale-display">
          {Math.round(scale * 100)}%
        </span>

        <button
          onClick={handleZoomIn}
          disabled={scale >= 3.0}
          className="pdf-nav__button"
          title="Zoom In"
        >
          <ZoomIn size={16} />
        </button>
      </div>

      {/* Right: Title */}
      <div className="pdf-nav__right">
        <h3 className="pdf-nav__title">PDF</h3>
      </div>
    </div>
  );
};

// --- [ HTML NAV COMPONENT ] ---

interface HtmlNavProps {
  currentPage: number;
  supCount: number;
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

const HtmlNav: React.FC<HtmlNavProps> = ({
  currentPage,
  supCount,
  zoomLevel,
  onZoomIn,
  onZoomOut,
}) => {
  return (
    <div className="html-nav">
      {/* Left: Title */}
      <div className="html-nav__left">
        <FileText size={18} className="html-nav__icon" />
        <h3 className="html-nav__title">HTML</h3>
      </div>

      {/* Center: Zoom Controls */}
      <div className="html-nav__center">
        <button
          onClick={onZoomOut}
          className="html-nav__button"
          title="Zoom Out"
        >
          <ZoomOut size={20} />
        </button>
        <span className="html-nav__zoom-level">
          {Math.round(zoomLevel * 100)}%
        </span>
        <button
          onClick={onZoomIn}
          className="html-nav__button"
          title="Zoom In"
        >
          <ZoomIn size={20} />
        </button>
      </div>

      {/* Right: Info */}
      <div className="html-nav__right">
        <span className="html-nav__info-item">
          Superscripts: <span className="html-nav__info-count">{supCount}</span>
        </span>
        <span className="html-nav__separator">|</span>
        <span>Page {currentPage}</span>
      </div>
    </div>
  );
};

// --- [ PDF VIEWER COMPONENT ] ---

interface PdfViewerProps {
  currentPage: number;
  selectedProject: string | null;
  docName: string;
}

const PdfViewer: React.FC<PdfViewerProps> = ({ currentPage, selectedProject, docName }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [scale, setScale] = useState(1.0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number | undefined>();
  const [pdfData, setPdfData] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Loading Pdf Data
  useEffect(() => {
    if (!selectedProject || !docName) {
      setPdfData(null);
      setIsLoading(false);
      return;
    }

    const loadPdfData = async () => {
      setIsLoading(true);
      setError(null);
      setPdfData(null);

      try {
        const data = await toolApi.getDocumentDetail(selectedProject, docName);

        if (data.pdf_base64) {
          setPdfData(`data:application/pdf;base64,${data.pdf_base64}`);
        } else {
          throw new Error('PDF data (base64) was not found in the API response.');
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown PDF loading error';
        setError(errorMsg);
      } finally {
        setIsLoading(false);
      }
    };

    loadPdfData();
  }, [currentPage, selectedProject, docName]);

  const handleDocumentLoadSuccess = () => {
    setIsLoading(false);
  };

  // Measure container width and respond to resizes
  useEffect(() => {
    const setWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };
    setWidth();
    window.addEventListener('resize', setWidth);
    return () => {
      window.removeEventListener('resize', setWidth);
    };
  }, []);

  const handleReset = useCallback(() => {
    setScale(1.0);
  }, []);

  return (
    <div className="pdf-viewer">
      {selectedProject && docName && (
        <PdfNav scale={scale} onScaleChange={setScale} onReset={handleReset} />
      )}

      <div className="pdf-viewer__content-area" ref={containerRef}>
        {isLoading && (
          <div className="pdf-viewer__loader-container">
            <div className="pdf-viewer__spinner"></div>
          </div>
        )}
        {error && !isLoading && (
          <div className="pdf-viewer__error-box">
            <h3 className="pdf-viewer__error-title">Error Loading PDF</h3>
            <p className="pdf-viewer__error-message">{error}</p>
          </div>
        )}
        {pdfData && !error && (
          <Document
            file={pdfData}
            onLoadSuccess={handleDocumentLoadSuccess}
            onLoadError={(err) => {
              setError(`React-PDF Error: ${err.message}`);
              setIsLoading(false);
            }}
            loading=""
          >
            <Page pageNumber={1} width={containerWidth} scale={scale} />
          </Document>
        )}
      </div>
    </div>
  );
};

// --- [ HTML VIEWER COMPONENT ] ---

interface HtmlViewerProps {
  currentPage: number;
  highlights: Highlight[];
  isHighlightMode: boolean;
  onAddHighlight: (highlight: Omit<Highlight, 'id'>) => void;
  activeFilter: string | null;
  onStyleCountsChange: (counts: StyleCounts) => void;
  selectedProject: string | null;
  docName: string;
}

const HtmlViewer: React.FC<HtmlViewerProps> = ({
  currentPage,
  highlights,
  isHighlightMode,
  onAddHighlight,
  activeFilter,
  onStyleCountsChange,
  selectedProject,
  docName,
}) => {
  const [content, setContent] = useState<string>('');
  const [supCount, setSupCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleZoomIn = () => setZoom(prev => prev + 0.1);
  const handleZoomOut = () => setZoom(prev => Math.max(0.2, prev - 0.1));

  // Load HTML content
  useEffect(() => {
    if (!selectedProject || !docName) {
      setContent('');
      setIsLoading(false);
      return;
    }

    const loadHtmlContent = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await toolApi.getDocumentDetail(selectedProject, docName);
        const htmlUrl = data.html_url;

        if (!htmlUrl) {
          throw new Error("HTML URL was not found in the API response.");
        }
        const htmlResponse = await fetch(htmlUrl);
        if (!htmlResponse.ok) {
          throw new Error(`Failed to load HTML content from ${htmlUrl}`);
        }
        let htmlContent = await htmlResponse.text();

        // Inject base styling into the head
        htmlContent = htmlContent.replace(
          /<head>(.*?)<\/head>/s,
          `<head>$1<style>body { font-size: 20px; }</style></head>`
        );
        setContent(htmlContent);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMsg);
        setContent(`<h2>Error loading page ${currentPage}</h2><p>${errorMsg}</p>`);
      } finally {
        setIsLoading(false);
      }
    };
    loadHtmlContent();
  }, [currentPage, selectedProject, docName]);

  // Detect styles and apply filters after iframe loads
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      const iDoc = iframe.contentWindow?.document;
      if (!iDoc) return;

      // 1. Detect and tag elements with data-style attributes
      const allElements = iDoc.body.getElementsByTagName('*');
      const counts: StyleCounts = { bold: 0, italic: 0, boldItalic: 0, superscript: 0 };

      Array.from(allElements).forEach(el => {
        const style = window.getComputedStyle(el);
        const isBold = style.fontWeight === '700' || style.fontWeight === 'bold';
        const isItalic = style.fontStyle === 'italic';

        el.removeAttribute('data-style-bold');
        el.removeAttribute('data-style-italic');
        el.removeAttribute('data-style-bold-italic');

        if (isBold && isItalic) {
          counts.boldItalic++;
          el.setAttribute('data-style-bold-italic', 'true');
        } else if (isBold) {
          counts.bold++;
          el.setAttribute('data-style-bold', 'true');
        } else if (isItalic) {
          counts.italic++;
          el.setAttribute('data-style-italic', 'true');
        }
      });

      const supElements = iDoc.getElementsByTagName('sup');
      counts.superscript = supElements.length;
      Array.from(supElements).forEach(el => el.setAttribute('data-style-superscript', 'true'));

      setSupCount(counts.superscript);
      onStyleCountsChange(counts);

      // 2. Apply the active filter style
      let styleElement = iDoc.getElementById('filter-style');
      if (!styleElement) {
        styleElement = iDoc.createElement('style');
        styleElement.id = 'filter-style';
        iDoc.head.appendChild(styleElement);
      }

      const styleRule = "text-decoration: underline; text-decoration-color: lightblue; text-decoration-thickness: 3px;";
      let cssText = `
        sup { background-color: #22c55e; color: white; padding: 1px 3px; border-radius: 2px; font-size: 0.7em; }
      `;

      if (activeFilter) {
        const kebabCaseFilter = activeFilter.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
        cssText += `[data-style-${kebabCaseFilter}] { ${styleRule} }`;
      }

      styleElement.textContent = cssText;
    };

    iframe.addEventListener('load', handleLoad);
    return () => iframe.removeEventListener('load', handleLoad);

  }, [content, onStyleCountsChange, activeFilter]);


  // Handle Highlighting
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;

    const handleMouseUp = () => {
      if (!isHighlightMode) return;
      const selection = iframe.contentWindow?.getSelection();
      if (!selection || selection.isCollapsed) return;
      const range = selection.getRangeAt(0);
      Array.from(range.getClientRects()).forEach(rect => {
        if (rect.width > 0 && rect.height > 0) {
          onAddHighlight({
            pageNumber: currentPage,
            x: rect.left + (iframe.contentWindow?.scrollX || 0),
            y: rect.top + (iframe.contentWindow?.scrollY || 0),
            width: rect.width,
            height: rect.height,
          });
        }
      });
      selection.removeAllRanges();
    };

    const doc = iframe.contentWindow.document;
    doc.addEventListener('mouseup', handleMouseUp);
    return () => doc.removeEventListener('mouseup', handleMouseUp);
  }, [isHighlightMode, currentPage, onAddHighlight]);

  const pageHighlights = highlights.filter(h => h.pageNumber === currentPage);

  return (
    <div className="html-viewer">
      {selectedProject && docName && (
        <HtmlNav
          currentPage={currentPage}
          supCount={supCount}
          zoomLevel={zoom}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
        />
      )}

      <div className="html-viewer__content-area">
        {selectedProject && docName ? (
          isLoading ? (
            <div className="html-viewer__loader-container">
              <div className="html-viewer__spinner"></div>
            </div>
          ) : error ? (
            <div className="html-viewer__error-box">
              <h3 className="html-viewer__error-title">Error Loading Content</h3>
              <p className="html-viewer__error-message">{error}</p>
            </div>
          ) : (
            <div className="html-viewer__iframe-wrapper" style={{ transform: `scale(${zoom})` }}>
              <iframe
                ref={iframeRef}
                srcDoc={content}
                title={`HTML Output - Page ${currentPage}`}
                className="html-viewer__iframe"
              />
              <div className="html-viewer__highlight-overlay">
                {pageHighlights.map(highlight => (
                  <div
                    key={highlight.id}
                    className="html-viewer__highlight"
                    style={{
                      top: `${highlight.y}px`,
                      left: `${highlight.x}px`,
                      width: `${highlight.width}px`,
                      height: `${highlight.height}px`
                    }}
                  />
                ))}
              </div>
            </div>
          )
        ) : (
          <div style={{ textAlign: 'center', padding: '5rem', width: '100%', color: '#6b7280' }}>
          </div>
        )}
      </div>
    </div>
  );
};

// --- [ NAVBAR COMPONENT ] ---

interface NavbarProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onHighlightModeToggle: () => void;
  isHighlightMode: boolean;
  onUndo: () => void;
  onDeleteAll: () => void;
  canUndo: boolean;
  activeFilter: string | null;
  onFilterChange: (filter: string) => void;
  styleCounts: StyleCounts;
  currentDocName: string;
  gtEntries: GroundTruthEntry[];
  setGtEntries: React.Dispatch<React.SetStateAction<GroundTruthEntry[]>>;

  // New Props for Project Selection
  projectList: string[];
  selectedProject: string | null;
  onProjectChange: (project: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  onHighlightModeToggle,
  isHighlightMode,
  onUndo,
  onDeleteAll,
  canUndo,
  activeFilter,
  onFilterChange,
  styleCounts,
  currentDocName,
  gtEntries,
  setGtEntries,

  // New Props
  projectList,
  selectedProject,
  onProjectChange,
}) => {
  const [pageInput, setPageInput] = useState(currentPage.toString());
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement>(null);
  const [isGtPanelOpen, setIsGtPanelOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
        setIsFilterMenuOpen(false);
      }
    };

    if (isFilterMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      const iframe = document.querySelector('.html-viewer__iframe') as HTMLIFrameElement;
      if (iframe?.contentWindow) {
        iframe.contentWindow.document.addEventListener('mousedown', handleClickOutside);
      }
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        if (iframe?.contentWindow) {
          iframe.contentWindow.document.removeEventListener('mousedown', handleClickOutside);
        }
      };
    }
  }, [isFilterMenuOpen]);

  useEffect(() => {
    setPageInput(currentPage.toString());
  }, [currentPage]);

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInput(e.target.value);
  };

  const handlePageNavigation = () => {
    const pageNum = parseInt(pageInput, 10);
    if (pageNum >= 1 && pageNum <= totalPages) {
      onPageChange(pageNum);
    } else {
      setPageInput(currentPage.toString());
    }
  };

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const FilterButton: React.FC<{ name: string; filterKey: keyof StyleCounts }> = ({ name, filterKey }) => (
    <button
      onClick={() => onFilterChange(filterKey)}
      className={`filter-button ${activeFilter === filterKey ? 'filter-button--active' : ''}`}
    >
      <span>{name}</span>
      <span className="filter-count">{styleCounts[filterKey]}</span>
    </button>
  );

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <div className="navbar-left">
          <h1 className="navbar-title">PDF vs HTML</h1>

          {/* Project Selection Dropdown */}
          <div className="doc-selector-container">
            <select
              className="doc-selector-trigger"
              value={selectedProject || ''}
              onChange={(e) => onProjectChange(e.target.value)}
              disabled={projectList.length === 0}
            >
              <option value="" disabled>
                Please choose a project...
              </option>
              {projectList.map((project) => (
                <option key={project} value={project}>
                  {project}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Conditionally render controls only if a project is selected */}
        {selectedProject && totalPages > 0 && (
          <>
            <div className="navbar-center">
              <button onClick={handlePrevious} disabled={currentPage <= 1} className="nav-button">
                <ChevronLeft size={20} />
              </button>
              <form onSubmit={(e) => { e.preventDefault(); handlePageNavigation(); }} className="page-form">
                <span className="page-label">Page</span>
                <input
                  type="number"
                  value={pageInput}
                  onChange={handlePageInputChange}
                  onBlur={handlePageNavigation}
                  onKeyDown={(e) => { if (e.key === 'Enter') handlePageNavigation(); }}
                  min={1}
                  max={totalPages}
                  className="page-input"
                />
                <span className="page-label">of {totalPages}</span>
              </form>
              <button onClick={handleNext} disabled={currentPage >= totalPages} className="nav-button">
                <ChevronRight size={20} />
              </button>
            </div>

            <div className="navbar-right">
              <div className="gt-container">
                <button
                  onClick={() => setIsGtPanelOpen(prev => !prev)}
                  className={`tool-button tool-button--gt ${isGtPanelOpen ? 'active' : ''}`}
                  title="Ground Truth Entries"
                >
                  <Database size={20} />
                </button>
                {isGtPanelOpen && (
                  <GroundTruthPanel
                    currentPage={currentPage}
                    onClose={() => setIsGtPanelOpen(false)}
                    entries={gtEntries}
                    setEntries={setGtEntries}
                    currentDocName={currentDocName}
                  />
                )}
              </div>
              <button
                onClick={onHighlightModeToggle}
                className={`tool-button tool-button--highlight ${isHighlightMode ? 'active' : ''}`}
                title="Toggle Highlight Mode"
              >
                <Edit3 size={20} />
              </button>
              <button onClick={onUndo} disabled={!canUndo} className="tool-button" title="Undo Last Highlight">
                <Undo size={20} />
              </button>
              <button onClick={onDeleteAll} disabled={!canUndo} className="tool-button tool-button--delete" title="Delete All Highlights">
                <Trash2 size={20} />
              </button>
              <div className="filter-menu-container" ref={filterMenuRef}>
                <button
                  onClick={() => setIsFilterMenuOpen(prev => !prev)}
                  className={`tool-button tool-button--filter ${isFilterMenuOpen || activeFilter ? 'active' : ''}`}
                  title="Toggle Style Filters"
                >
                  <Filter size={20} />
                </button>
                {isFilterMenuOpen && (
                  <div className="filter-menu">
                    <FilterButton name="Bold" filterKey="bold" />
                    <FilterButton name="Italic" filterKey="italic" />
                    <FilterButton name="Bold-Italic" filterKey="boldItalic" />
                    <FilterButton name="Superscript" filterKey="superscript" />
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </nav>
  );
};


// --- [ MAIN EXPORT COMPONENT: PdfVsHtmlViewer ] ---

export function PdfVsHtmlViewer() {
  const navigate = useNavigate();

  // State Management 
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [styleCounts, setStyleCounts] = useState<StyleCounts>({ bold: 0, italic: 0, boldItalic: 0, superscript: 0 });
  const [gtEntries, setGtEntries] = useState<GroundTruthEntry[]>([]);
  const [projectList, setProjectList] = useState<string[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [documentList, setDocumentList] = useState<string[]>([]);

  // Use the highlight logic hook
  const {
    highlights, isHighlightMode, addHighlight, removeLastHighlight,
    clearAllHighlights, toggleHighlightMode, canUndo
  } = useHighlightsLogic();

  // Use the hook to fetch initial project list and ground truth data
  useInitialData(setGtEntries, setProjectList);

  const currentDocName = documentList.length > 0 && currentPage <= documentList.length ? documentList[currentPage - 1] : '';

  // Effect to fetch documents when a project is selected
  useEffect(() => {
    if (!selectedProject) return;

    const fetchDocumentsInProject = async () => {
      try {
        const data = await toolApi.getDocumentsInProject(selectedProject);

        if (data) {
          setDocumentList(data);
          setTotalPages(data.length);
          setCurrentPage(1);
        }
      } catch (error) {
        console.error("Error fetching documents:", error);
        setDocumentList([]);
        setTotalPages(0);
      }
    };

    fetchDocumentsInProject();
  }, [selectedProject]);

  // Event Handlers
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };
  const handleProjectChange = (projectName: string) => setSelectedProject(projectName);
  const handleFilterChange = (filter: string) => setActiveFilter(prev => (prev === filter ? null : filter));
  const handleStyleCountsChange = (counts: StyleCounts) => setStyleCounts(counts);

  return (
    <div className="tool-viewer full-page-view">
      <div className="viewer-content">
        <div className="app-container">
          <Navbar
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            onHighlightModeToggle={toggleHighlightMode}
            isHighlightMode={isHighlightMode}
            onUndo={removeLastHighlight}
            onDeleteAll={clearAllHighlights}
            canUndo={canUndo}
            onFilterChange={handleFilterChange}
            activeFilter={activeFilter}
            styleCounts={styleCounts}
            currentDocName={currentDocName}
            gtEntries={gtEntries}
            setGtEntries={setGtEntries}
            projectList={projectList}
            selectedProject={selectedProject}
            onProjectChange={handleProjectChange}
          />

          <div className="main-content">
            <div className="html-viewer-container">
              <HtmlViewer
                currentPage={currentPage}
                highlights={highlights}
                onAddHighlight={addHighlight}
                isHighlightMode={isHighlightMode}
                activeFilter={activeFilter}
                onStyleCountsChange={handleStyleCountsChange}
                selectedProject={selectedProject}
                docName={currentDocName}
              />
            </div>
            <div className="pdf-viewer-container">
              <PdfViewer
                currentPage={currentPage}
                selectedProject={selectedProject}
                docName={currentDocName}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}