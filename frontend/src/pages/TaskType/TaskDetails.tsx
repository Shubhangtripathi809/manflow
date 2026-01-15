import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    ArrowLeft, Plus, Search, Settings, Loader2,
    Upload, Database, FileText, CheckCircle2,
    X, Download, Film, FileJson, ChevronLeft, ChevronRight, Trash2
} from 'lucide-react';
import { projectsApi, taskApi, documentsApi } from '@/services/api';
import { TaskCard } from '@/pages/MyTask/MyTask';
import { TaskDetailModal } from '../MyTask/TaskDetailModal';
import { CreateTask } from '@/pages/MyTask/CreateTask';
import { MediaPreviewModal, MediaThumbnail } from './ContentCreation';
import { pdfjs, Document as PDFDocument, Page as PDFPage } from 'react-pdf';
import { FixedSizeList } from 'react-window';
import './TaskDetails.scss';
import { APITesting } from './APITesting';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type TabType = 'tasks' | 'add_documents' | 'gt' | 'api_testing';
type StatusFilter = 'all' | 'pending' | 'in_progress' | 'completed' | 'revision_needed';
type GTFileType = 'gt' | 'running_gt';

interface GTFile {
    id: string;
    name: string;
    original_file_name: string;
    file_type: string;
    status: string;
    version: number;
    created_at: string;
    gt_type: GTFileType;
}

// GT File Upload Modal Component
function GTUploadModal({
    onClose,
    onUpload
}: {
    onClose: () => void;
    onUpload: (file: File, gtType: GTFileType) => Promise<void>;
}) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [gtFileChecked, setGtFileChecked] = useState(false);
    const [runningGtChecked, setRunningGtChecked] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isCheckboxSelected = gtFileChecked || runningGtChecked;
    const canUpload = selectedFile && isCheckboxSelected;

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            setError(null);
        }
    };

    const handleUpload = async () => {
        if (!canUpload) return;

        // Only one checkbox is selected
        if (gtFileChecked && runningGtChecked) {
            setError('Please select only one GT type');
            return;
        }

        const gtType: GTFileType = gtFileChecked ? 'gt' : 'running_gt';

        try {
            setIsUploading(true);
            setError(null);
            await onUpload(selectedFile, gtType);
            onClose();
        } catch (err: any) {
            setError(err.message || 'Upload failed');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="gt-upload-modal-overlay" onClick={onClose}>
            <div className="gt-upload-modal" onClick={e => e.stopPropagation()}>
                <div className="gt-upload-modal__header">
                    <h3>Upload Ground Truth File</h3>
                    <button onClick={onClose} className="gt-upload-modal__close">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="gt-upload-modal__body">
                    {/* File Selection */}
                    <div className="gt-upload-modal__file-section">
                        <label className="gt-upload-modal__file-label">
                            <Upload className="h-6 w-6" />
                            <span>{selectedFile ? selectedFile.name : 'Choose a file'}</span>
                            <input
                                type="file"
                                onChange={handleFileSelect}
                                accept=".pdf,.json"
                                className="hidden"
                            />
                        </label>
                    </div>

                    {/* GT Type Selection */}
                    <div className="gt-upload-modal__checkbox-section">
                        <p className="gt-upload-modal__checkbox-title">Select GT Type (Required)</p>
                        <label className="gt-upload-modal__checkbox">
                            <input
                                type="checkbox"
                                checked={gtFileChecked}
                                onChange={(e) => {
                                    setGtFileChecked(e.target.checked);
                                    if (e.target.checked) setRunningGtChecked(false);
                                }}
                                disabled={isUploading}
                            />
                            <span>GT File</span>
                        </label>
                        <label className="gt-upload-modal__checkbox">
                            <input
                                type="checkbox"
                                checked={runningGtChecked}
                                onChange={(e) => {
                                    setRunningGtChecked(e.target.checked);
                                    if (e.target.checked) setGtFileChecked(false);
                                }}
                                disabled={isUploading}
                            />
                            <span>LLM File</span>
                        </label>
                    </div>

                    {error && (
                        <div className="gt-upload-modal__error">{error}</div>
                    )}
                </div>

                <div className="gt-upload-modal__footer">
                    <button
                        onClick={onClose}
                        className="gt-upload-modal__btn gt-upload-modal__btn--cancel"
                        disabled={isUploading}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleUpload}
                        className="gt-upload-modal__btn gt-upload-modal__btn--upload"
                        disabled={!canUpload || isUploading}
                    >
                        {isUploading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Uploading...
                            </>
                        ) : (
                            'Upload'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

// Single File Viewer Component
function GTFileViewer({
    file,
    projectId,
    onClose
}: {
    file: GTFile;
    projectId: string;
    onClose: () => void;
}) {
    const [numPages, setNumPages] = useState<number | null>(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [fileError, setFileError] = useState<string | null>(null);

    const { data: downloadUrl, isLoading } = useQuery({
        queryKey: ['document-download-url', projectId, file.id],
        queryFn: () => documentsApi.getDownloadUrl(projectId, { document_id: file.id }).then(res => res.url),
        staleTime: 5 * 60 * 1000,
    });

    return (
        <div className="gt-file-viewer">
            <div className="gt-file-viewer__header">
                <h2>{file.original_file_name || file.name}</h2>
                <div className="gt-file-viewer__actions">
                    {downloadUrl && (
                        <button
                            onClick={async () => {
                                try {
                                    const response = await fetch(downloadUrl);
                                    const blob = await response.blob();
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = file.original_file_name || file.name;
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                    window.URL.revokeObjectURL(url);
                                } catch (error) {
                                    console.error('Download failed:', error);
                                    window.open(downloadUrl, '_blank');
                                }
                            }}
                            className="gt-file-viewer__download"
                            title="Download"
                        >
                            <Download className="h-5 w-5" />
                        </button>
                    )}
                </div>
            </div>

            <div className="gt-file-viewer__content">
                {isLoading ? (
                    <Loader2 className="h-10 w-10 animate-spin" />
                ) : fileError ? (
                    <div className="text-destructive">{fileError}</div>
                ) : file.file_type === 'pdf' ? (
                    <div className="gt-file-viewer__pdf">
                        <PDFDocument
                            file={downloadUrl}
                            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                            onLoadError={(err) => setFileError(err.message)}
                        >
                            <PDFPage
                                pageNumber={pageNumber}
                                width={800}
                                renderTextLayer={true}
                                renderAnnotationLayer={true}
                            />
                        </PDFDocument>
                        {numPages && numPages > 1 && (
                            <div className="gt-file-viewer__pagination">
                                <button
                                    disabled={pageNumber <= 1}
                                    onClick={() => setPageNumber(p => p - 1)}
                                >
                                    <ChevronLeft />
                                </button>
                                <span>Page {pageNumber} of {numPages}</span>
                                <button
                                    disabled={pageNumber >= numPages}
                                    onClick={() => setPageNumber(p => p + 1)}
                                >
                                    <ChevronRight />
                                </button>
                            </div>
                        )}
                    </div>
                ) : file.file_type === 'image' ? (
                    <img src={downloadUrl} alt="Preview" className="gt-file-viewer__image" />
                ) : file.file_type === 'video' ? (
                    // Video files - Open in new tab
                    <div className="gt-file-viewer__unsupported">
                        <Film className="h-20 w-20 text-blue-500" />
                        <p className="text-lg font-medium mt-4">Video File</p>
                        <p className="text-sm text-gray-500 mb-6">Click below to open the video</p>
                        {downloadUrl && (
                            <button
                                onClick={() => window.open(downloadUrl, '_blank')}
                                className="gt-download-btn"
                            >
                                <Film className="h-5 w-5" />
                                Open Video
                            </button>
                        )}
                    </div>
                ) : file.file_type === 'json' ? (
                    <div className="gt-file-viewer__json">
                        <FileJson className="h-20 w-20" />
                        <p>JSON File</p>
                        <a href={downloadUrl} download target="_blank" rel="noopener noreferrer">Download to View</a>
                    </div>
                ) : ['ppt', 'pptx'].includes(file.original_file_name.split('.').pop()?.toLowerCase() || '') ? (
                    // PowerPoint files
                    <div className="gt-file-viewer__unsupported">
                        <FileText className="h-20 w-20 text-orange-500" />
                        <p className="text-lg font-medium mt-4">PowerPoint Presentation</p>
                        <p className="text-sm text-gray-500 mb-6">This file will open in PowerPoint Online</p>
                        {downloadUrl && (
                            <button
                                onClick={() => {
                                    const officeViewerUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(downloadUrl)}`;
                                    window.open(officeViewerUrl, '_blank');
                                }}
                                className="gt-download-btn"
                            >
                                <FileText className="h-5 w-5" />
                                Open PPT
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="gt-file-viewer__unsupported">
                        <FileText className="h-20 w-20" />
                        <p>No preview available for this file type</p>
                        {downloadUrl && (
                            <a href={downloadUrl} download target="_blank" rel="noopener noreferrer" className="gt-download-btn">
                                <Download className="h-5 w-5" />
                                Download to View
                            </a>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// GT Comparison View Component
function GTComparisonView({
    runningGtFile,
    gtFile,
    projectId,
    onClose
}: {
    runningGtFile: GTFile;
    gtFile: GTFile;
    projectId: string;
    onClose: () => void;
}) {
    const [numPages, setNumPages] = useState<number>(0);
    const [scale, setScale] = useState(1.1);

    const { data: runningGtUrl } = useQuery({
        queryKey: ['document-download-url', projectId, runningGtFile.id],
        queryFn: () => documentsApi.getDownloadUrl(projectId, { document_id: runningGtFile.id }).then(res => res.url),
    });

    const { data: gtUrl } = useQuery({
        queryKey: ['document-download-url', projectId, gtFile.id],
        queryFn: () => documentsApi.getDownloadUrl(projectId, { document_id: gtFile.id }).then(res => res.url),
    });

    // Individual Row Item
    const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
        <div style={{ ...style, display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #e2e8f0' }}>
            {/* Left side: LLM GT */}
            <div className="gt-comparison__viewer" style={{ borderRight: '1px solid #cbd5e1', overflow: 'hidden' }}>
                <PDFDocument file={runningGtUrl} loading={null} error={null}>
                    <PDFPage
                        pageNumber={index + 1}
                        scale={scale}
                        renderAnnotationLayer={false}
                        renderTextLayer={false}
                        loading={null}
                    />
                </PDFDocument>
            </div>
            {/* Right side: Original GT */}
            <div className="gt-comparison__viewer" style={{ overflow: 'hidden' }}>
                <PDFDocument file={gtUrl} loading={null} error={null}>
                    <PDFPage
                        pageNumber={index + 1}
                        scale={scale}
                        renderAnnotationLayer={false}
                        renderTextLayer={false}
                        loading={null}
                    />
                </PDFDocument>
            </div>
        </div>
    );

    return (
        <div className="gt-comparison" style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
            {/* Hidden component to get the page count once */}
            <div style={{ display: 'none' }}>
                <PDFDocument file={gtUrl} onLoadSuccess={({ numPages }) => setNumPages(numPages)} />
            </div>

            <div className="gt-comparison__nav-bar">
                <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-lg shadow-sm border">
                    <button className="p-1 hover:bg-slate-100 rounded" onClick={() => setScale(s => Math.max(s - 0.1, 0.5))}>
                        <span className="text-xl font-bold">−</span>
                    </button>
                    <span className="text-sm font-mono font-bold w-12 text-center">{Math.round(scale * 100)}%</span>
                    <button className="p-1 hover:bg-slate-100 rounded" onClick={() => setScale(s => Math.min(s + 0.1, 2.5))}>
                        <span className="text-xl font-bold">+</span>
                    </button>
                </div>
            </div>

            <div style={{ flex: 1, width: '100%' }}>
                {numPages > 0 && (
                    <FixedSizeList
                        height={window.innerHeight - 220}
                        itemCount={numPages}
                        itemSize={850 * scale}
                        width={"100%"}
                    >
                        {Row}
                    </FixedSizeList>
                )}
            </div>
        </div>
    );
}

export function TaskDetails() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [activeTab, setActiveTab] = useState<TabType>('tasks');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [tasks, setTasks] = useState<any[]>([]);
    const [isLoadingTasks, setIsLoadingTasks] = useState(true);
    const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<any | null>(null);

    // Upload & Media States
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [selectedMedia, setSelectedMedia] = useState<any | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // GT States
    const [isGTUploadModalOpen, setIsGTUploadModalOpen] = useState(false);
    const [gtFiles, setGtFiles] = useState<GTFile[]>([]);
    const [runningGtFiles, setRunningGtFiles] = useState<GTFile[]>([]);

    // New GT Table States
    const [comparisonView, setComparisonView] = useState<{
        gtFile: GTFile | null;
        runningGtFile: GTFile | null;
        isOpen: boolean;
    }>({ gtFile: null, runningGtFile: null, isOpen: false });

    const { data: project, isLoading: isProjectLoading } = useQuery({
        queryKey: ['project', id],
        queryFn: () => projectsApi.get(id!),
        enabled: !!id,
    });

    // Fetch documents for the grid
    const { data: documentsData, isLoading: isMediaLoading } = useQuery({
        queryKey: ['documents', { project: id }],
        queryFn: () => documentsApi.list({ project: id }),
        enabled: !!id && activeTab === 'add_documents',
    });

    // Fetch GT documents
    const { data: gtDocumentsData, isLoading: isGTLoading } = useQuery({
        queryKey: ['gt-documents', { project: id }],
        queryFn: () => documentsApi.list({ project: id }),
        enabled: !!id && activeTab === 'gt',
    });

    const allResults = documentsData?.results || documentsData || [];
    const mediaFiles = allResults.filter((file: any) => {
        const hasGtMetadata = !!file.metadata?.gt_category;
        return !hasGtMetadata;
    });

    // Process GT files when data changes
    useEffect(() => {
        if (gtDocumentsData) {
            const allFiles = gtDocumentsData.results || gtDocumentsData || [];
            const gt: GTFile[] = [];
            const runningGt: GTFile[] = [];

            allFiles.forEach((file: any) => {
                const gtType = file.metadata?.gt_category;
                if (!gtType) return;
                const gtFile: GTFile = {
                    id: file.id,
                    name: file.name,
                    original_file_name: file.original_file_name || file.name,
                    file_type: file.file_type,
                    status: file.status || 'draft',
                    version: file.version_count || 1,
                    created_at: file.created_at,
                    gt_type: gtType
                };

                if (gtType === 'running_gt') {
                    runningGt.push(gtFile);
                } else {
                    gt.push(gtFile);
                }
            });

            setGtFiles(gt);
            setRunningGtFiles(runningGt);
        }
    }, [gtDocumentsData]);

    // Helper to match GT and LLM GT files by name
    const getMatchedFiles = () => {
        const matched: Array<{
            fileName: string;
            gtFile: GTFile | null;
            runningGtFile: GTFile | null;
            uploadDate: string;
        }> = [];

        const allFileNames = new Set([
            ...gtFiles.map(f => f.original_file_name),
            ...runningGtFiles.map(f => f.original_file_name)
        ]);

        allFileNames.forEach(fileName => {
            const gt = gtFiles.find(f => f.original_file_name === fileName);
            const running = runningGtFiles.find(f => f.original_file_name === fileName);

            if (gt || running) {
                matched.push({
                    fileName,
                    gtFile: gt || null,
                    runningGtFile: running || null,
                    uploadDate: gt?.created_at || running?.created_at || ''
                });
            }
        });

        return matched.sort((a, b) =>
            new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
        );
    };

    const handleCompare = (gtFile: GTFile, runningGtFile: GTFile) => {
        setComparisonView({
            gtFile,
            runningGtFile,
            isOpen: true
        });
    };

    const handleDeleteDocument = async (documentId: string) => {
        if (!id || !window.confirm('Are you sure you want to delete this file?')) return;

        try {
            await documentsApi.delete(documentId);
            queryClient.invalidateQueries({ queryKey: ['gt-documents', { project: id }] });
        } catch (error) {
            console.error('Failed to delete document:', error);
        }
    };

    const fetchTasks = useCallback(async () => {
        try {
            setIsLoadingTasks(true);
            const data = await taskApi.list();
            const allTasks = data.tasks || data.results || [];
            const projectTasks = allTasks.filter((t: any) => String(t.project) === id);
            setTasks(projectTasks);
        } catch (error) {
            console.error("Failed to fetch tasks:", error);
        } finally {
            setIsLoadingTasks(false);
        }
    }, [id]);

    useEffect(() => {
        if (id) fetchTasks();
    }, [id, fetchTasks]);

    // Reusable Upload Flow
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !id) return;

        const MAX_FILE_SIZE = 500 * 1024 * 1024;
        if (file.size > MAX_FILE_SIZE) {
            setUploadError('File size exceeds the 500 MB limit.');
            return;
        }

        try {
            setIsUploading(true);
            setUploadError(null);
            const projectIdNum = Number(id);

            const uploadUrlResponse = await documentsApi.getUploadUrl(id!, {
                file_name: file.name,
                file_type: file.type || 'application/octet-stream',
            });

            const { url: s3Url, fields: s3Fields, file_key } = uploadUrlResponse;

            await documentsApi.uploadFileToS3(s3Url, s3Fields, file);

            const ext = file.name.split('.').pop()?.toLowerCase() || '';
            const imageTypes = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'];
            const docTypes = ['doc', 'docx', 'pdf', 'txt', 'rtf'];
            const spreadsheetTypes = ['xls', 'xlsx', 'csv'];
            const presentationTypes = ['ppt', 'pptx'];

            let mappedType = 'other';
            if (imageTypes.includes(ext)) mappedType = 'image';
            else if (ext === 'pdf') mappedType = 'pdf';
            else if (ext === 'json') mappedType = 'json';
            else if (docTypes.includes(ext) || spreadsheetTypes.includes(ext) || presentationTypes.includes(ext)) mappedType = 'document';
            else if (ext === 'zip' || ext === 'xml') mappedType = ext;

            const confirmResponse = await documentsApi.confirmUpload(id!, {
                file_key: file_key,
                file_name: file.name,
                file_type: mappedType,
            });

            if (confirmResponse.id) {
                await documentsApi.getDownloadUrl(id!, { document_id: confirmResponse.id });
            }

            queryClient.invalidateQueries({ queryKey: ['documents', { project: id }] });
        } catch (err: any) {
            setUploadError(err.message || 'Upload failed');
        } finally {
            setIsUploading(false);
        }
    };

    // GT File Upload Handler
    const handleGTFileUpload = async (file: File, gtType: GTFileType) => {
        if (!id) return;

        const MAX_FILE_SIZE = 500 * 1024 * 1024;
        if (file.size > MAX_FILE_SIZE) {
            throw new Error('File size exceeds the 500 MB limit.');
        }

        try {
            const projectIdNum = Number(id);

            const uploadUrlResponse = await documentsApi.getUploadUrl(id!, {
                file_name: file.name,
                file_type: file.type || 'application/octet-stream',
            });

            const { url: s3Url, fields: s3Fields, file_key } = uploadUrlResponse;

            await documentsApi.uploadFileToS3(s3Url, s3Fields, file);

            const ext = file.name.split('.').pop()?.toLowerCase() || '';
            let mappedType = 'other';
            if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) mappedType = 'image';
            else if (ext === 'pdf') mappedType = 'pdf';
            else if (ext === 'json') mappedType = 'json';

            const confirmResponse = await documentsApi.confirmUpload(id!, {
                file_key: file_key,
                file_name: file.name,
                file_type: mappedType,
                metadata: {
                    gt_category: gtType
                }
            });

            if (confirmResponse.id) {
                await documentsApi.getDownloadUrl(id!,{ document_id: confirmResponse.id });
            }

            queryClient.invalidateQueries({ queryKey: ['gt-documents', { project: id }] });
        } catch (err: any) {
            throw new Error(err.message || 'Upload failed');
        }
    };

    const handleDeleteTask = async (taskId: number) => {
        try {
            await taskApi.delete(taskId);
            setTasks(prev => prev.filter(t => t.id !== taskId));
            setSelectedTask(null);
        } catch (error) {
            console.error("Failed to delete task:", error);
        }
    };


    const statusCounts = {
        all: tasks.length,
        pending: tasks.filter(t => t.status.toLowerCase() === 'pending').length,
        in_progress: tasks.filter(t => t.status.toLowerCase() === 'in_progress').length,
        completed: tasks.filter(t => t.status.toLowerCase() === 'completed').length,
        revision_needed: tasks.filter(t => t.status.toLowerCase() === 'revision_needed').length,
    };

    if (isProjectLoading) return <div className="content-creation-loading"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="content-creation task-details">
            <div className="content-creation__main">
                {!comparisonView.isOpen && (
                    <div className="content-creation__header-top">
                        <Link to="/projects" className="content-creation__back-button">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <div className="content-creation__title-section flex justify-between items-center w-full">
                            <div>
                                <h1 className="content-creation__title">{project?.name}</h1>
                                <p className="content-creation__subtitle">
                                    {project?.task_type.replace('_', ' ').toUpperCase()} Dashboard
                                </p>
                            </div>
                            <button onClick={() => navigate(`/projects/${id}/settings`)} className="p-2 hover:bg-gray-100 rounded-full flex items-center gap-2">
                                <Settings className="h-5 w-5" />
                                <span className="text-sm font-medium">Settings</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Only show tabs if comparison view is NOT open */}
                {!comparisonView.isOpen && (
                    <div className="content-creation__tabs">
                        {(['tasks', 'add_documents', 'gt', 'api_testing'] as TabType[]).map((tab) => (
                            <button
                                key={tab}
                                className={`content-creation__tab ${activeTab === tab ? 'content-creation__tab--active' : ''}`}
                                onClick={() => setActiveTab(tab)}
                            >
                                {tab === 'add_documents' ? 'Add Documents' : tab.toUpperCase()}
                            </button>
                        ))}
                        <button className="content-creation__tab content-creation__tab--create-task" onClick={() => setIsCreateTaskModalOpen(true)}>
                            <Plus className="h-4 w-4" /> Create Task
                        </button>
                    </div>
                )}
                <div className="content-creation__content">
                    {activeTab === 'tasks' && (
                        <div className="content-creation__tasks">
                            {isLoadingTasks ? (
                                <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8" /></div>
                            ) : tasks.filter(t => statusFilter === 'all' || t.status.toLowerCase() === statusFilter).length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {tasks.filter(t => statusFilter === 'all' || t.status.toLowerCase() === statusFilter).map(task => (
                                        <TaskCard key={task.id} task={task} onTaskClick={setSelectedTask} />
                                    ))}
                                </div>
                            ) : (
                                <div className="content-creation__tasks-empty">
                                    <div className="content-creation__empty-icon">📋</div>
                                    <h3>No tasks found</h3>
                                    <p>Try changing your filter or create a new task</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'add_documents' && (
                        <div className="content-creation__media">
                            <div className="content-creation__upload-area">
                                <label className={`content-creation__upload-box ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                                    <input
                                        type="file"
                                        className="hidden"
                                        onChange={handleFileUpload}
                                        disabled={isUploading}
                                        accept="*"
                                    />
                                    {isUploading ? (
                                        <Loader2 className="content-creation__upload-icon animate-spin" />
                                    ) : (
                                        <Upload className="content-creation__upload-icon" />
                                    )}
                                    <p className="content-creation__upload-text">
                                        {isUploading ? 'Uploading to S3...' : 'Drop documents here or click to browse'}
                                    </p>
                                    <p className="content-creation__upload-subtext">All document types supported (Max 500MB)</p>
                                    {uploadError && <p className="text-destructive text-sm mt-2">{uploadError}</p>}
                                </label>
                            </div>

                            {isMediaLoading ? (
                                <div className="flex justify-center p-12">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" />
                                </div>
                            ) : mediaFiles.length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-6">
                                    {mediaFiles.map((file: any) => (
                                        <div
                                            key={file.id}
                                            className="border rounded-lg p-2 bg-white text-center cursor-pointer hover:shadow-md transition-shadow"
                                            onClick={() => setSelectedMedia(file)}
                                        >
                                            <div className="aspect-square bg-muted rounded flex items-center justify-center mb-2 overflow-hidden border relative">
                                                <MediaThumbnail file={file} projectId={id!} />
                                            </div>
                                            <p className="text-xs font-medium truncate">{file.original_file_name || file.name}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="content-creation__media-empty">
                                    <FileText className="content-creation__empty-media-icon" />
                                    <p className="content-creation__empty-text">No documents uploaded yet</p>
                                </div>
                            )}
                        </div>
                    )}
                    {activeTab === 'gt' && (
                        <div className="gt-container">
                            <div className="gt-header">
                                <div className="flex items-center gap-4">
                                    {comparisonView.isOpen && (
                                        <button
                                            className="p-2 hover:bg-gray-100 rounded-full"
                                            onClick={() => setComparisonView({ gtFile: null, runningGtFile: null, isOpen: false })}
                                        >
                                            <ArrowLeft className="h-6 w-6" />
                                        </button>
                                    )}
                                    <h2 className="gt-header__title">
                                        {comparisonView.isOpen
                                            ? comparisonView.gtFile?.original_file_name
                                            : 'Ground Truth Management'}
                                    </h2>
                                </div>

                                {!comparisonView.isOpen && (
                                    <button className="gt-header__upload-btn" onClick={() => setIsGTUploadModalOpen(true)}>
                                        <Upload className="h-4 w-4" />
                                        Upload GT
                                    </button>
                                )}
                            </div>

                            {isGTLoading ? (
                                <div className="flex justify-center p-12">
                                    <Loader2 className="h-8 w-8 animate-spin" />
                                </div>
                            ) : comparisonView.isOpen && comparisonView.gtFile && comparisonView.runningGtFile ? (
                                // Comparison View
                                <div className="gt-comparison-wrapper">
                                    <GTComparisonView
                                        runningGtFile={comparisonView.runningGtFile}
                                        gtFile={comparisonView.gtFile}
                                        projectId={id!}
                                        onClose={() => setComparisonView({ gtFile: null, runningGtFile: null, isOpen: false })}
                                    />
                                </div>
                            ) : (
                                // Table View
                                <div className="gt-table-container">
                                    <table className="gt-table">
                                        <thead>
                                            <tr>
                                                <th>Uploaded Document Name</th>
                                                <th>Date & Time</th>
                                                <th>GT File</th>
                                                <th>LLM GT</th>
                                                <th>Comparing File</th>
                                                <th>Download</th>
                                                <th>Delete</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {getMatchedFiles().length === 0 ? (
                                                <tr>
                                                    <td colSpan={7} className="gt-table-empty">
                                                        <FileText className="h-12 w-12" />
                                                        <p>No GT files uploaded yet</p>
                                                    </td>
                                                </tr>
                                            ) : (
                                                getMatchedFiles().map((row, index) => {
                                                    const canCompare = row.gtFile && row.runningGtFile;
                                                    const comparisonStatus = canCompare ? 'Ready' : 'Pending';

                                                    return (
                                                        <tr key={index}>
                                                            <td className="gt-table-filename">{row.fileName}</td>
                                                            <td className="gt-table-date">
                                                                {new Date(row.uploadDate).toLocaleString('en-GB', {
                                                                    day: '2-digit',
                                                                    month: 'short',
                                                                    year: 'numeric',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit',
                                                                    hour12: true
                                                                })}
                                                            </td>
                                                            <td className="gt-table-file">
                                                                {row.gtFile ? (
                                                                    <span className="gt-file-badge gt-file-badge--gt">
                                                                        <CheckCircle2 className="h-4 w-4" />
                                                                        {row.gtFile.file_type.toUpperCase()}
                                                                    </span>
                                                                ) : (
                                                                    <span className="gt-file-badge gt-file-badge--empty">—</span>
                                                                )}
                                                            </td>
                                                            <td className="gt-table-file">
                                                                {row.runningGtFile ? (
                                                                    <span className="gt-file-badge gt-file-badge--running">
                                                                        <CheckCircle2 className="h-4 w-4" />
                                                                        {row.runningGtFile.file_type.toUpperCase()}
                                                                    </span>
                                                                ) : (
                                                                    <span className="gt-file-badge gt-file-badge--empty">—</span>
                                                                )}
                                                            </td>
                                                            <td className="gt-table-status">
                                                                {canCompare ? (
                                                                    <button
                                                                        className="gt-compare-btn gt-compare-btn--active"
                                                                        onClick={() => handleCompare(row.gtFile!, row.runningGtFile!)}
                                                                    >
                                                                        Compare
                                                                    </button>
                                                                ) : (
                                                                    <span className="gt-status-pending">Pending</span>
                                                                )}
                                                            </td>
                                                            <td className="gt-table-actions">
                                                                {(row.gtFile || row.runningGtFile) && (
                                                                    <button
                                                                        className="gt-action-btn"
                                                                        onClick={async () => {
                                                                            const file = row.gtFile || row.runningGtFile;
                                                                            if (file) {
                                                                                const url = await documentsApi.getDownloadUrl(id!, {
                                                                                    document_id: file.id
                                                                                });
                                                                                window.open(url.url, '_blank');
                                                                            }
                                                                        }}
                                                                    >
                                                                        <Download className="h-4 w-4" />
                                                                    </button>
                                                                )}
                                                            </td>
                                                            <td className="gt-table-actions">
                                                                {(row.gtFile || row.runningGtFile) && (
                                                                    <button
                                                                        className="gt-action-btn gt-action-btn--delete"
                                                                        onClick={async () => {
                                                                            if (!window.confirm('Are you sure you want to delete this row?')) return;

                                                                            try {
                                                                                // Delete GT file if exists
                                                                                if (row.gtFile) {
                                                                                    await handleDeleteDocument(row.gtFile.id);
                                                                                }
                                                                                // Delete LLM GT file if exists
                                                                                if (row.runningGtFile) {
                                                                                    await handleDeleteDocument(row.runningGtFile.id);
                                                                                }
                                                                            } catch (error) {
                                                                                console.error('Failed to delete files:', error);
                                                                            }
                                                                        }}
                                                                        title="Delete Row"
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* API Testing Tab Content */}
                    {activeTab === 'api_testing' && (
                        <APITesting />
                    )}
                </div>
            </div>

            <div className="content-creation__sidebar">
                <div className="content-creation__sidebar-section">
                    <h3 className="content-creation__sidebar-title">FILTER BY STATUS</h3>
                    <div className="content-creation__sidebar-filters">
                        {(['all', 'pending', 'in_progress', 'completed', 'revision_needed'] as StatusFilter[]).map((status) => (
                            <button
                                key={status}
                                className={`content-creation__sidebar-filter ${statusFilter === status ? 'content-creation__sidebar-filter--active' : ''}`}
                                onClick={() => setStatusFilter(status)}
                            >
                                <span className="content-creation__sidebar-filter-label">
                                    {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
                                </span>
                                <span className="content-creation__sidebar-filter-count">{statusCounts[status as keyof typeof statusCounts]}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {selectedMedia && (
                <MediaPreviewModal
                    doc={selectedMedia}
                    projectId={id!}
                    onClose={() => setSelectedMedia(null)}
                />
            )}

            {isGTUploadModalOpen && (
                <GTUploadModal
                    onClose={() => setIsGTUploadModalOpen(false)}
                    onUpload={handleGTFileUpload}
                />
            )}

            {isCreateTaskModalOpen && (
                <div className="content-creation__modal-overlay">
                    <div className="content-creation__modal-container">
                        <CreateTask onClose={() => setIsCreateTaskModalOpen(false)} onSuccess={fetchTasks} isModal={true} fixedProjectId={id} />
                    </div>
                </div>
            )}

            {selectedTask && (
                <TaskDetailModal
                    task={selectedTask}
                    onClose={() => setSelectedTask(null)}
                    onTaskUpdated={fetchTasks}
                    onDelete={handleDeleteTask}
                />
            )}
        </div>
    );
}