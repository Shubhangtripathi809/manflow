import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Save,
  CheckCircle,
  History,
  FileText,
  Download,
  Film,
  Image as ImageIcon,
  FileJson,
  FileCode,
  Loader2
} from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Input
} from '@/components/common';
import { documentsApi, projectsApi } from '@/services/api';
import { formatDate, formatDateTime, getStatusColor } from '@/lib/utils';
import type { Document, GTVersion } from '@/types';
import { Document as PDFDocument, Page as PDFPage, pdfjs } from 'react-pdf';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

function useDownloadUrl(projectId: number | undefined, documentId: string | undefined) {
  return useQuery({
    queryKey: ['document-download-url', projectId, documentId],
    queryFn: async () => {
      if (!projectId || !documentId) return null;
      console.log(`[SourcePreview] Requesting download URL for doc: ${documentId}`);
      const response = await documentsApi.getDownloadUrl(projectId, { document_id: documentId });
      return response.url;
    },
    enabled: !!projectId && !!documentId,
    staleTime: 5 * 60 * 1000,
  });
}

function SourcePreview({ doc }: { doc: Document }) {
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [isLoadingFile, setIsLoadingFile] = useState(false);

  const { data: downloadUrl, isLoading: isUrlLoading } = useDownloadUrl(doc.project, doc.id);

  // DEBUG LOGS
  console.log(`[SourcePreview] Rendering doc: ${doc.name}`);
  console.log(`[SourcePreview] Detected file_type in metadata: "${doc.file_type}"`);

  useEffect(() => {
    if (!downloadUrl) return;

    const fetchContent = async () => {
      if (doc.file_type === 'json' || doc.file_type === 'text') {
        console.log(`[SourcePreview] Fetching raw text content for ${doc.file_type}...`);
        setIsLoadingFile(true);
        try {
          const response = await fetch(downloadUrl);
          const text = await response.text();
          setFileContent(text);
        } catch (err) {
          console.error("[SourcePreview] Fetch error:", err);
          setFileError("Failed to load file content.");
        } finally {
          setIsLoadingFile(false);
        }
      }
    };
    fetchContent();
  }, [downloadUrl, doc.file_type]);

  if (isUrlLoading || isLoadingFile) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-muted/30 rounded-lg border">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
        <p className="text-sm text-muted-foreground">Loading source file...</p>
      </div>
    );
  }

  if (fileError || !downloadUrl) {
    return (
      <div className="p-6 bg-destructive/10 border border-destructive/20 rounded-lg text-center">
        <p className="text-sm text-destructive font-medium">{fileError || "Could not retrieve download URL."}</p>
      </div>
    );
  }

  // BRANCH 1: VIDEO
  if (doc.file_type === 'video') {
    console.log("[SourcePreview] Rendering as VIDEO");
    return (
      <div className="w-full rounded-lg overflow-hidden bg-black shadow-lg">
        <video controls className="w-full max-h-[500px]">
          <source src={downloadUrl} />
          Your browser does not support the video tag.
        </video>
      </div>
    );
  }

  // BRANCH 2: IMAGE
  if (doc.file_type === 'image') {
    console.log("[SourcePreview] Rendering as IMAGE");
    return (
      <div className="w-full flex justify-center">
        <img 
          src={downloadUrl} 
          alt={doc.name} 
          className="max-w-full h-auto rounded-lg border shadow-sm"
          onError={(e) => console.error("[SourcePreview] Image failed to load:", e)}
        />
      </div>
    );
  }

  // BRANCH 3: JSON / TEXT
  if (doc.file_type === 'json' || doc.file_type === 'text') {
    console.log("[SourcePreview] Rendering as TEXT/JSON block");
    return (
      <div className="w-full">
        <div className="bg-slate-950 text-slate-50 rounded-lg p-4 max-h-[500px] overflow-auto border shadow-inner">
          <pre className="text-xs font-mono whitespace-pre-wrap break-all">
            {fileContent}
          </pre>
        </div>
      </div>
    );
  }

  // BRANCH 4: PDF
  if (doc.file_type === 'pdf') {
    console.log("[SourcePreview] Rendering as PDF using react-pdf");
    return (
      <div className="w-full flex flex-col items-center">
        <PDFDocument
          file={downloadUrl}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          onLoadError={(err) => {
            console.error("[SourcePreview] PDF Load Error:", err);
            setFileError(`Failed to load PDF: ${err.message}`);
          }}
        >
          <PDFPage 
            pageNumber={pageNumber} 
            width={500}
            renderTextLayer={true}
            renderAnnotationLayer={true}
          />
        </PDFDocument>
        {numPages && numPages > 1 && (
          <div className="flex items-center gap-4 mt-4">
            <Button variant="outline" size="sm" onClick={() => setPageNumber(p => Math.max(1, p - 1))} disabled={pageNumber <= 1}>Previous</Button>
            <span className="text-sm font-medium">Page {pageNumber} of {numPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPageNumber(p => Math.min(numPages, p + 1))} disabled={pageNumber >= numPages}>Next</Button>
          </div>
        )}
      </div>
    );
  }

  console.warn(`[SourcePreview] No renderer found for type: "${doc.file_type}"`);
  return (
    <div className="text-center p-8 bg-muted rounded-lg border-2 border-dashed">
      <FileText className="h-10 w-10 mx-auto mb-2 opacity-20" />
      <p className="font-medium">Unsupported File Type</p>
      <p className="text-sm text-muted-foreground">The system thinks this is a "{doc.file_type}"</p>
    </div>
  );
}

export function DocumentDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [gtData, setGtData] = useState<string>('');
  const [changeSummary, setChangeSummary] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [jsonError, setJsonError] = useState('');
  const [activeTab, setActiveTab] = useState<'editor' | 'versions'>('editor');

  const { data: document, isLoading } = useQuery({
    queryKey: ['document', id],
    queryFn: () => documentsApi.get(id!),
    enabled: !!id,
  });

  const { data: versions } = useQuery({
    queryKey: ['document-versions', id],
    queryFn: () => documentsApi.getVersions(id!),
    enabled: !!id,
  });

  useEffect(() => {
    if (document?.current_gt_version?.gt_data) {
      setGtData(JSON.stringify(document.current_gt_version.gt_data, null, 2));
    }
  }, [document]);

  const createVersionMutation = useMutation({
    mutationFn: (data: { gt_data: Record<string, unknown>; change_summary?: string }) =>
      documentsApi.createVersion(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document', id] });
      queryClient.invalidateQueries({ queryKey: ['document-versions', id] });
      setIsEditing(false);
      setChangeSummary('');
    },
  });

  const approveMutation = useMutation({
    mutationFn: () => documentsApi.approve(id!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['document', id] }),
  });

  const handleSaveVersion = () => {
    try {
      const parsedData = JSON.parse(gtData);
      createVersionMutation.mutate({ gt_data: parsedData, change_summary: changeSummary });
    } catch {
      setJsonError('Invalid JSON format');
    }
  };

  if (isLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>;
  if (!document) return <div className="text-center py-12"><h2>Document not found</h2></div>;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link to={`/projects/${document.project}`} className="p-2 hover:bg-accent rounded-lg"><ArrowLeft className="h-5 w-5" /></Link>
          <div>
            <h1 className="text-2xl font-bold">{document.original_file_name || document.name}</h1>
            <div className="flex gap-2 mt-1">
                <Badge variant="secondary" className="uppercase">{document.file_type}</Badge>
                <Badge className={getStatusColor(document.status)}>{document.status}</Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
           {document.status === 'in_review' && (
            <Button onClick={() => approveMutation.mutate()} disabled={approveMutation.isPending}>
              <CheckCircle className="h-4 w-4 mr-2" /> Approve
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-4 border-b">
        <button onClick={() => setActiveTab('editor')} className={`pb-2 px-4 text-sm font-bold ${activeTab === 'editor' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}>GT Editor</button>
        <button onClick={() => setActiveTab('versions')} className={`pb-2 px-4 text-sm font-bold ${activeTab === 'versions' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}>History ({versions?.length || 0})</button>
      </div>

      {activeTab === 'editor' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Source File</CardTitle></CardHeader>
            <CardContent><SourcePreview doc={document as Document} /></CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Ground Truth Editor</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <textarea
                value={gtData}
                onChange={(e) => { setGtData(e.target.value); setJsonError(''); }}
                onFocus={() => setIsEditing(true)}
                rows={18}
                className="w-full p-4 rounded-lg bg-slate-50 font-mono text-xs border border-slate-200"
              />
              {isEditing && (
                <div className="p-4 bg-slate-100 rounded-lg space-y-4">
                  <Input value={changeSummary} onChange={(e) => setChangeSummary(e.target.value)} placeholder="Summary of changes" className="bg-white" />
                  <div className="flex gap-2">
                    <Button onClick={handleSaveVersion} disabled={createVersionMutation.isPending}>Save Version</Button>
                    <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'versions' && (
        <Card>
          <CardHeader><CardTitle>History</CardTitle></CardHeader>
          <CardContent>
             <div className="space-y-4">
                {versions?.map((v: GTVersion) => (
                  <div key={v.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                        <p className="font-bold">Version {v.version_number}</p>
                        <p className="text-xs text-muted-foreground">{formatDateTime(v.created_at)}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => { setGtData(JSON.stringify(v.gt_data, null, 2)); setActiveTab('editor'); }}>Load</Button>
                  </div>
                ))}
             </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}