import * as React from 'react';
import { toolApi } from '@/services/api';
import type {
    PageContentResponse,
    ProcessedPageData,
    PageContentErrorResponse,
    SelectableElement,
    SelectedElementData,
    JsonViewerFile,
    GetTableCellsResponse,
    SelectableTextElement,
    SelectableCellElement
} from '@/types';
import Loader from '@/components/common/loader';
import './PdfJson.scss';
import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Label } from '@/components/common/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/common/diaog';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url
).toString();

function extractBasePdfName(fullFileName: string): string {
    const regex = /^\d{2}-\w+-\d{4}\s\d{2}:\d{2}:\d{2}-(.+)$/;
    const match = fullFileName.match(regex);

    if (match && match[1]) {
        return match[1];
    }
    return fullFileName;
}

//Internal Nav Component 
interface NavProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    onPrevPage: () => void;
    onNextPage: () => void;
    zoomLevel: number;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onZoomReset: () => void;
    onDownloadPDF?: () => void;
    canZoomIn: boolean;
    canZoomOut: boolean;
}

function Nav({
    currentPage,
    totalPages,
    onPageChange,
    onPrevPage,
    onNextPage,
    zoomLevel,
    onZoomIn,
    onZoomOut,
    onZoomReset,
    onDownloadPDF,
    canZoomIn,
    canZoomOut,
}: NavProps) {
    const [pageInput, setPageInput] = React.useState<string>(currentPage.toString());

    React.useEffect(() => {
        setPageInput(currentPage.toString());
    }, [currentPage]);

    const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (/^\d*$/.test(value)) {
            setPageInput(value);
        }
    };

    const handlePageInputBlur = () => {
        const pageNum = parseInt(pageInput, 10);
        if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
            onPageChange(pageNum);
        } else {
            setPageInput(currentPage.toString());
        }
    };

    const handlePageInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handlePageInputBlur();
            (e.target as HTMLInputElement).blur();
        } else if (e.key === 'Escape') {
            setPageInput(currentPage.toString());
            (e.target as HTMLInputElement).blur();
        }
    };

    return (
        <div className="pdf-nav-container">
            {/* Left Section: Page Navigation */}
            <div className="pdf-nav-section pdf-nav-left">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={onPrevPage}
                    disabled={currentPage <= 1}
                    title="Previous page"
                    aria-label="Previous page"
                    className="pdf-nav-arrow"
                >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M10 3L5 8l5 5V3z" />
                    </svg>
                </Button>

                <div className="pdf-nav-page-info">
                    <span className="pdf-nav-label">Page</span>
                    <Input
                        type="text"
                        className="pdf-nav-page-input"
                        value={pageInput}
                        onChange={handlePageInputChange}
                        onBlur={handlePageInputBlur}
                        onKeyDown={handlePageInputKeyDown}
                        aria-label="Current page"
                    />
                    <span className="pdf-nav-total">of {totalPages}</span>
                </div>

                <Button
                    variant="outline"
                    size="icon"
                    onClick={onNextPage}
                    disabled={currentPage >= totalPages}
                    title="Next page"
                    aria-label="Next page"
                    className="pdf-nav-arrow"
                >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M6 3v10l5-5-5-5z" />
                    </svg>
                </Button>
            </div>

            {/* Center Section: Zoom Controls */}
            <div className="pdf-nav-section pdf-nav-center">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={onZoomOut}
                    disabled={!canZoomOut}
                    title="Zoom out"
                    aria-label="Zoom out"
                    className="pdf-nav-zoom"
                >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" />
                        <path d="M4 6.5h6a.5.5 0 0 1 0 1H4a.5.5 0 0 1 0-1z" />
                    </svg>
                </Button>

                <span className="pdf-nav-zoom-level" title={`Current zoom: ${Math.round(zoomLevel * 100)}%`}>
                    {Math.round(zoomLevel * 100)}%
                </span>

                <Button
                    variant="outline"
                    size="icon"
                    onClick={onZoomIn}
                    disabled={!canZoomIn}
                    title="Zoom in"
                    aria-label="Zoom in"
                    className="pdf-nav-zoom"
                >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" />
                        <path d="M6.5 3a.5.5 0 0 1 .5.5V6h2.5a.5.5 0 0 1 0 1H7v2.5a.5.5 0 0 1-1 0V7H3.5a.5.5 0 0 1 0-1H6V3.5a.5.5 0 0 1 .5-.5z" />
                    </svg>
                </Button>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={onZoomReset}
                    title="Reset zoom to 150%"
                    aria-label="Reset zoom"
                    className="pdf-nav-reset"
                >
                    Reset
                </Button>
            </div>

            {/* Right Section: Download Button */}
            <div className="pdf-nav-section pdf-nav-right">
                {onDownloadPDF && (
                    <Button
                        onClick={onDownloadPDF}
                        title="Download PDF"
                        aria-label="Download PDF"
                        className="pdf-nav-download"
                    >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z" />
                            <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z" />
                        </svg>
                        <span>Download</span>
                    </Button>
                )}
            </div>
        </div>
    );
}

//API Processing Logic
const processApiResponse = (data: PageContentResponse): ProcessedPageData[] => {
    if (!data.data) {
        console.error('No data found in API response');
        return [];
    }

    const processedData: ProcessedPageData[] = [];

    // Iterate through each page number key in the data object
    Object.keys(data.data).forEach(pageKey => {
        const pageData = data.data[pageKey];

        // Check if this page has page info
        if (!pageData.page || pageData.page.length === 0) {
            console.warn(`No page data found for key: ${pageKey}`);
            return;
        }
        pageData.page.forEach(p => {
            const pageNum = p.page;
            const rawElements: (SelectableElement & { page: number })[] = [
                ...(pageData.text || []).map(t => ({ ...t, type: 'text' as const })),
                ...(pageData.table || []).map(t => ({ ...t, type: 'table' as const })),
                ...(pageData.cell || []).map(c => ({ ...c, type: 'cell' as const })),
            ];

            const selectableElements = rawElements
                .filter(el => el.page === pageNum)
                .map(el => {
                    return { ...el } as SelectableElement;
                });

            processedData.push({
                page_num: pageNum,
                page_b64: p.page_pdf,
                json_metadata: p.page_json ? JSON.parse(p.page_json) : {},
                selectable_elements: selectableElements,
            });
        });
    });

    return processedData.sort((a, b) => a.page_num - b.page_num);
};

// PDFJsonViewer Component 
interface PDFJsonViewerProps {
    selectedFileName: string | null;
}

function PDFJsonViewer({ selectedFileName }: PDFJsonViewerProps) {
    const [pageData, setPageData] = React.useState<ProcessedPageData[]>([]);
    const [currentPage, setCurrentPage] = React.useState<number>(1);
    const [isLoading, setIsLoading] = React.useState(false);
    const [selectedElement, setSelectedElement] = React.useState<SelectedElementData | null>(null);
    const [pdfError, setPdfError] = React.useState<string | null>(null);
    const [renderScale, setRenderScale] = React.useState(1.5);
    const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
    const [editText, setEditText] = React.useState('');
    const editInputRef = React.useRef<HTMLTextAreaElement>(null);

    const totalPages = pageData.length > 0 ? pageData[pageData.length - 1].page_num : 0;
    const currentViewData = pageData.find(d => d.page_num === currentPage) || null;

    // --- API Fetch Logic ---
    React.useEffect(() => {
        if (!selectedFileName) {
            setPageData([]);
            setCurrentPage(1);
            setIsLoading(false);
            return;
        }

        async function loadPageContent() {
            setIsLoading(true);
            setPdfError(null);
            try {
                const cleanFileName = extractBasePdfName(selectedFileName!);
                const apiResponse = await toolApi.fetchPageContentJson(cleanFileName);
                if (!apiResponse.ok) {
                    const errorResponse = apiResponse as PageContentErrorResponse;
                    throw new Error(errorResponse.error || 'Unknown API error');
                }

                const successfulResponse = apiResponse as PageContentResponse;

                if (!successfulResponse.data || Object.keys(successfulResponse.data).length === 0) {
                    console.warn(`API returned successful status but no page data for ${selectedFileName}`);
                    alert(`Warning: The file "${selectedFileName}" was found, but no PDF page data was returned by the API.`);
                    setPageData([]);
                    setCurrentPage(1);
                    return;
                }

                const processed = processApiResponse(successfulResponse);

                if (processed.length === 0) {
                    console.warn(`No pages could be processed from the API response for ${selectedFileName}`);
                    alert(`Warning: The file "${selectedFileName}" was found, but no pages could be processed from the response.`);
                }

                setPageData(processed);
                setCurrentPage(processed.length > 0 ? processed[0].page_num : 1);
                setSelectedElement(null);
            } catch (error) {
                console.error('Failed to fetch page content:', error);
                setPageData([]);

                let errorMessage = "A critical error occurred while fetching data.";

                if (error instanceof Error && error.message.includes('(Status: 504)')) {
                    errorMessage = `Timeout Error (504): The server took too long to respond for file "${selectedFileName}".`;
                } else if (error instanceof Error) {
                    errorMessage = `Failed to fetch data: ${error.message}`;
                }

                setPdfError(errorMessage);
            } finally {
                setIsLoading(false);
            }
        }
        loadPageContent();
    }, [selectedFileName]);

    // --- Navigation Handlers ---
    const goToPage = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
            setSelectedElement(null);
        }
    };

    const handleNextPage = () => {
        goToPage(currentPage + 1);
    };

    const handlePrevPage = () => {
        goToPage(currentPage - 1);
    };

    // --- Zoom Handlers ---
    const handleZoomIn = () => setRenderScale(prev => Math.min(prev + 0.25, 3));
    const handleZoomOut = () => setRenderScale(prev => Math.max(prev - 0.25, 0.5));
    const handleResetZoom = () => setRenderScale(1.5);

    // --- Edit Handlers ---
    const handleEditClick = () => {
        if (selectedElement && selectedElement.type === 'text') {
            setEditText((selectedElement.data as any).text);
            setIsEditModalOpen(true);
        }
    };

    const handleSaveEdit = () => {
        setPageData(prevData =>
            prevData.map(p => {
                if (p.page_num === currentPage && selectedElement?.type === 'text') {
                    const updatedElements = p.selectable_elements.map(el => {
                        if (el.id === selectedElement.id && el.type === 'text') {
                            return { ...el, text: editText } as SelectableElement;
                        }
                        return el;
                    });
                    setSelectedElement(prevEl => {
                        if (prevEl && prevEl.id === selectedElement.id && prevEl.type === 'text') {
                            return {
                                ...prevEl,
                                data: { ...(prevEl.data as any), text: editText } as Omit<SelectableElement, 'type'>
                            };
                        }
                        return prevEl;
                    });

                    return { ...p, selectable_elements: updatedElements };
                }
                return p;
            })
        );

        alert(`Saved (simulated): "${editText}"`);
        setIsEditModalOpen(false);
    };

    const handleCancelEdit = () => {
        setIsEditModalOpen(false);
        setEditText('');
    };

    // --- Download Handler ---
    const handleDownloadPDF = () => {
        if (!currentViewData?.page_b64) return;

        try {
            const byteCharacters = atob(currentViewData.page_b64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'application/pdf' });

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${selectedFileName}_page_${currentPage}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to download PDF:', error);
            alert('Failed to download PDF. Please try again.');
        }
    };

    // --- Internal PdfViewer Component
    const PdfViewer = () => {
        const canvasRef = React.useRef<HTMLCanvasElement>(null);
        const containerRef = React.useRef<HTMLDivElement>(null);
        const [pdfDoc, setPdfDoc] = React.useState<PDFDocumentProxy | null>(null);
        const [isRendering, setIsRendering] = React.useState(false);
        const [canvasDimensions, setCanvasDimensions] = React.useState<{ width: number, height: number } | null>(null);

        // Load PDF document when page data changes
        React.useEffect(() => {
            if (!currentViewData?.page_b64) {
                setPdfDoc(null);
                setPdfError(null);
                return;
            }

            const loadPdf = async () => {
                try {
                    setPdfError(null);

                    const pdfData = atob(currentViewData.page_b64);
                    const pdfArray = new Uint8Array(pdfData.length);
                    for (let i = 0; i < pdfData.length; i++) {
                        pdfArray[i] = pdfData.charCodeAt(i);
                    }

                    const loadingTask = pdfjsLib.getDocument({ data: pdfArray });
                    const pdf = await loadingTask.promise;
                    setPdfDoc(pdf);
                } catch (error) {
                    console.error('Error loading PDF:', error);
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error loading PDF';
                    setPdfError(errorMessage);
                }
            };

            loadPdf();
            return () => {
                if (pdfDoc) {
                    pdfDoc.destroy();
                }
            };
        }, [currentViewData?.page_b64]);

        // Render PDF page on canvas
        React.useEffect(() => {
            if (!pdfDoc) return;

            const canvas = canvasRef.current;
            if (!canvas) return; // 👈 Fixes "possibly null" error

            let isMounted = true;

            const renderPage = async () => {
                setIsRendering(true);

                try {
                    const page: PDFPageProxy = await pdfDoc.getPage(1);
                    const context = canvas.getContext("2d");
                    if (!context) return;

                    const viewport = page.getViewport({ scale: renderScale });

                    canvas.width = viewport.width;
                    canvas.height = viewport.height;

                    await page.render({
                        canvasContext: context,
                        viewport: viewport,
                        canvas: canvas,  // 👈 REQUIRED by latest pdfjs
                    }).promise;

                } catch (error) {
                    console.error("Error rendering PDF:", error);
                } finally {
                    if (isMounted) {
                        setIsRendering(false);  // 👈 Loader hides correctly here
                    }
                }
            };

            renderPage();

            return () => {
                isMounted = false;
            };

        }, [pdfDoc, renderScale]);



        const handleElementClick = (element: SelectableElement, event: React.MouseEvent) => {
            event.stopPropagation();
            setSelectedElement({
                id: element.id,
                type: element.type,
                data: element,
            });
        };


        return (
            <div ref={containerRef} className="pdf-viewer-body panel-body">
                {pdfError ? (
                    <div className="pdf-error-container">
                        <div className="pdf-error-message">
                            <h3>Failed to load PDF page</h3>
                            <p>{pdfError}</p>
                            <Button
                                variant="default"
                                size="sm"
                                className="error-dismiss-btn"
                                onClick={() => setPdfError(null)}
                            >
                                Dismiss
                            </Button>
                        </div>
                    </div>
                ) : currentViewData && currentViewData.page_b64 ? (
                    <>
                        {(isLoading || isRendering) && <Loader />}

                        <div className="pdf-container-wrapper" style={{ width: canvasDimensions?.width, height: canvasDimensions?.height }}>
                            {/* PDF Canvas */}
                            <canvas
                                ref={canvasRef}
                                className="pdf-canvas"
                            />
                            <div className="text-overlay-container">
                                {/* Iterate over ALL selectable elements */}
                                {currentViewData.selectable_elements.map((element) => {
                                    const isSelected = selectedElement?.id === element.id;

                                    const topPx = element.top * renderScale;
                                    const leftPx = element.left * renderScale;
                                    const widthPx = (element.right - element.left) * renderScale;
                                    const heightPx = (element.bottom - element.top) * renderScale;
                                    const textElement = element as SelectableTextElement | SelectableCellElement;
                                    const titleText = textElement.text || element.type;


                                    return (
                                        <div
                                            key={element.id}
                                            className={`text-click-box ${isSelected ? 'selected' : ''} type-${element.type}`}
                                            style={{
                                                position: 'absolute',
                                                top: `${topPx}px`,
                                                left: `${leftPx}px`,
                                                width: `${widthPx}px`,
                                                height: `${heightPx}px`,
                                            }}
                                            onClick={(e) => handleElementClick(element, e)}
                                            title={titleText}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    </>
                ) : (
                    <p>No PDF page data available for this page.</p>
                )}
            </div>
        );
    };

    //Internal JsonViewer Component
    const JsonViewer = () => {
        React.useEffect(() => {
            if (isEditModalOpen) {
                editInputRef.current?.focus();
            }
        }, [isEditModalOpen]);

        const getDisplayData = () => {
            if (!selectedElement) return null;

            const { type, data } = selectedElement;
            const elementData = data as any;

            let displayObject: any = {
                id: elementData.id,
                type: type,
                coordinates: {
                    top: elementData.top.toFixed(2),
                    left: elementData.left.toFixed(2),
                    bottom: elementData.bottom.toFixed(2),
                    right: elementData.right.toFixed(2),
                }
            };

            // Add type-specific fields
            if (type === 'text' || type === 'cell') {
                displayObject.text = elementData.text;
            } else if (type === 'table') {
                displayObject.table_metadata = {
                    num_cols: elementData.table_num_cols,
                    num_rows: elementData.table_num_rows,
                    last_header_row: elementData.table_last_header_row,
                    last_header_col: elementData.table_last_header_col,
                    caption_text: elementData.caption_text,
                    label: elementData.label,
                };
                try {
                    displayObject.table_content = JSON.parse(elementData.table_np);
                } catch (e) {
                    displayObject.table_content_raw = elementData.table_np;
                }
            }
            return displayObject;
        };

        const displayData = getDisplayData();
        const isTextElement = selectedElement?.type === 'text';

        return (
            <div className="json-viewer-body panel-body">
                {selectedElement ? (
                    <>
                        <div className="json-info-banner">
                            <strong>Selected Element: {selectedElement.type.toUpperCase()}</strong>
                            <Button
                                variant="outline"
                                size="sm"
                                className="clear-selection-btn"
                                onClick={() => setSelectedElement(null)}
                            >
                                Clear Selection
                            </Button>
                        </div>
                        <div className="json-content-display">
                            <div className="json-section">
                                <h4 className="json-section-header">
                                    <span>Element Data:</span>
                                    {isTextElement && (
                                        <Button
                                            variant="default"
                                            size="sm"
                                            className="edit-text-btn"
                                            onClick={handleEditClick}
                                            disabled={isLoading}
                                        >
                                            Edit Text
                                        </Button>
                                    )}
                                </h4>
                                <pre>
                                    {JSON.stringify(displayData, null, 2)}
                                </pre>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="json-placeholder">
                        <p>Click on any text or table/cell in the PDF to view its JSON data</p>
                        {currentViewData && currentViewData.selectable_elements.length > 0 && (
                            <p className="text-muted">Available elements: {currentViewData.selectable_elements.length}</p>
                        )}
                    </div>
                )}
                <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Edit Text Element</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="form-group">
                                <Label htmlFor="editText">Text:</Label>
                                <textarea
                                    id="editText"
                                    ref={editInputRef}
                                    value={editText}
                                    onChange={(e) => setEditText(e.target.value)}
                                    rows={6}
                                    className="textarea-style"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="default" onClick={handleSaveEdit} disabled={editText.trim() === ''}>
                                Save Changes
                            </Button>
                            <Button variant="outline" onClick={handleCancelEdit}>
                                Cancel
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        );
    };

    if (isLoading) {
        return <Loader />;
    }

    if (!selectedFileName || pageData.length === 0) {
        if (selectedFileName && pageData.length === 0) {
            return (
                <div className="gt-page">
                    <div className="gt-header">
                        <h2 className="gt-title">JSON Run Results Viewer</h2>
                    </div>
                    <p className='mt-4'>No data available for **{selectedFileName}**.</p>
                </div>
            );
        }
        return <></>;
    }

    return (
        <div className="pdf-json-viewer-container">
            <div className="viewer-content-grid">
                {/* Left Panel: JSON Viewer */}
                <div className="viewer-panel json-panel">
                    <div className="panel-header">JSON Metadata (Page {currentPage})</div>
                    <JsonViewer />
                </div>

                <div className="viewer-panel pdf-panel">
                    <div className="panel-header">PDF Page View (Page {currentPage})</div>

                    {/* PDF NAV INSIDE RIGHT PANEL */}
                    <Nav
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={goToPage}
                        onPrevPage={handlePrevPage}
                        onNextPage={handleNextPage}
                        zoomLevel={renderScale}
                        onZoomIn={handleZoomIn}
                        onZoomOut={handleZoomOut}
                        onZoomReset={handleResetZoom}
                        onDownloadPDF={handleDownloadPDF}
                        canZoomIn={renderScale < 3}
                        canZoomOut={renderScale > 0.5}
                    />

                    <PdfViewer />
                </div>

            </div>
        </div>
    );
}


// --- Main GT Component
interface PdfJsonProps {
}

export function PdfJson({ }: PdfJsonProps) {
    const navigate = useNavigate();
    const [fileNames, setFileNames] = React.useState<JsonViewerFile[]>([]);
    const [selectedFileName, setSelectedFileName] = React.useState<string | null>(null);
    const [isFilesLoading, setIsFilesLoading] = React.useState(true);
    const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);

    React.useEffect(() => {
        async function loadFiles() {
            setIsFilesLoading(true);
            try {
                const apiResponse = await toolApi.getTableCellsFileNames();

                if (!apiResponse.data || !Array.isArray(apiResponse.data.myTableCells)) {
                    console.error("API returned successful status but missing or invalid 'myTableCells' array.", apiResponse);
                    setFileNames([]);
                    return;
                }
                const fileList: JsonViewerFile[] = apiResponse.data.myTableCells.map(item => {
                    const fileName = Object.keys(item)[0];
                    const metadata = item[fileName];

                    return {
                        fileName: fileName,
                        owner: metadata.owner || 'N/A',
                    } as JsonViewerFile;
                });

                setFileNames(fileList);
            } catch (error) {
                console.error('Failed to load file names for JSON viewer:', error);
                setFileNames([]);
            } finally {
                setIsFilesLoading(false);
            }
        }
        loadFiles();
    }, []);

    const handleSelectFile = (file: string) => {
        setSelectedFileName(file);
        setIsDropdownOpen(false);
    };

    return (
        <div>
            <div className="viewer-header">
                <h1>JSON Viewer</h1>
            </div>
            <div className="gt-page-content">
                <div className="gt-header">
                    <div className="gt-dropdown-container">
                        <div className="custom-select-container">
                            <div
                                className="select-display-box"
                                onClick={() => setIsDropdownOpen(prev => !prev)}
                            >
                                <span className="select-data-label">Select PDF</span>
                                <span className="select-value-text">
                                    {selectedFileName
                                        ? selectedFileName
                                        : "Please choose file for validation"
                                    }
                                </span>
                            </div>
                            {isDropdownOpen && (
                                <div className="select-dropdown-menu">
                                    <div className="file-list-scroll">
                                        {isFilesLoading ? (
                                            <div className="list-item loading">Loading files...</div>
                                        ) : fileNames.length === 0 ? (
                                            <div className="list-item empty">No Options</div>
                                        ) : (
                                            fileNames.map(file => (
                                                <div
                                                    key={file.fileName}
                                                    className={`list-item ${file.fileName === selectedFileName ? 'selected' : ''}`}
                                                    onClick={() => handleSelectFile(file.fileName)}
                                                >
                                                    <div className="file-name">{file.fileName}</div>
                                                    <span className='file-owner'>Owner: {file.owner}</span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="gt-main-viewer-area">
                    {selectedFileName ? (
                        <PDFJsonViewer selectedFileName={selectedFileName} />
                    ) : (
                        <div className="gt-json-viewer-placeholder">
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}