import { useState, useEffect, useRef } from 'react';
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight, RotateCw, Loader2 } from 'lucide-react';
import { pdfjsLib } from '@/utils/pdfjs';
import type { BBox, SearchResult } from '@/types';
import { useSearchStore } from '@/stores/searchStore';

interface PDFViewerProps {
  pdfUrl: string;
  currentResult?: SearchResult;
}

export default function PDFViewer({ pdfUrl, currentResult }: PDFViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.5);
  const [rotation, setRotation] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRendering, setIsRendering] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Load PDF document
  useEffect(() => {
    const loadPDF = async () => {
      try {
        setIsLoading(true);
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;
        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);
      } catch (error) {
        console.error('Error loading PDF:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPDF();
  }, [pdfUrl]);

  // Render current page
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    const renderPage = async () => {
      setIsRendering(true);
      try {
        const page = await pdfDoc.getPage(currentPage);
        const canvas = canvasRef.current!;
        const context = canvas.getContext('2d')!;

        const viewport = page.getViewport({ scale, rotation });

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        await page.render(renderContext).promise;

        // Draw highlights if current result matches this page
        if (currentResult && currentResult.segment.pageNumber === currentPage) {
          drawHighlight(context, currentResult.segment.bbox, viewport);
        }
      } catch (error) {
        console.error('Error rendering page:', error);
      } finally {
        setIsRendering(false);
      }
    };

    renderPage();
  }, [pdfDoc, currentPage, scale, rotation, currentResult]);

  // Navigate to page when search result changes
  useEffect(() => {
    if (currentResult) {
      setCurrentPage(currentResult.segment.pageNumber);
    }
  }, [currentResult]);

  const drawHighlight = (ctx: CanvasRenderingContext2D, bbox: BBox, viewport: any) => {
    const { x, y, width, height } = bbox;

    // Transform PDF coordinates to canvas coordinates
    const [canvasX, canvasY] = viewport.convertToViewportPoint(x, y);
    const [canvasX2, canvasY2] = viewport.convertToViewportPoint(x + width, y + height);

    const canvasWidth = canvasX2 - canvasX;
    const canvasHeight = canvasY2 - canvasY;

    // Draw semi-transparent yellow highlight
    ctx.fillStyle = 'rgba(255, 255, 0, 0.4)';
    ctx.fillRect(canvasX, canvasY, canvasWidth, canvasHeight);

    // Draw border
    ctx.strokeStyle = 'rgba(255, 200, 0, 0.8)';
    ctx.lineWidth = 2;
    ctx.strokeRect(canvasX, canvasY, canvasWidth, canvasHeight);
  };

  // Zoom controls
  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  // Page navigation
  const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const handleNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));

  // Pan controls
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      if (e.deltaY < 0) {
        handleZoomIn();
      } else {
        handleZoomOut();
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-600">Loading PDF...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Toolbar */}
      <div className="bg-gray-800 border-b border-gray-700 p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Page Navigation */}
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            className="p-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-white transition-colors"
            title="Previous page"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="px-3 py-1 bg-gray-700 rounded text-white text-sm">
            <span className="font-medium">{currentPage}</span>
            <span className="text-gray-400"> / {totalPages}</span>
          </div>

          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className="p-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-white transition-colors"
            title="Next page"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
          <button
            onClick={handleZoomOut}
            disabled={scale <= 0.5}
            className="p-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-white transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="w-5 h-5" />
          </button>

          <div className="px-3 py-1 bg-gray-700 rounded text-white text-sm min-w-[60px] text-center">
            {Math.round(scale * 100)}%
          </div>

          <button
            onClick={handleZoomIn}
            disabled={scale >= 3}
            className="p-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-white transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="w-5 h-5" />
          </button>

          {/* Rotate */}
          <button
            onClick={handleRotate}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded text-white transition-colors ml-2"
            title="Rotate"
          >
            <RotateCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* PDF Canvas */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-gray-800 relative"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <div
          className="inline-block m-4"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px)`,
            transition: isDragging ? 'none' : 'transform 0.1s ease',
          }}
        >
          <canvas
            ref={canvasRef}
            className="shadow-2xl bg-white"
            style={{
              display: isRendering ? 'none' : 'block',
            }}
          />
          {isRendering && (
            <div className="flex items-center justify-center bg-white" style={{ minHeight: '600px', minWidth: '400px' }}>
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-gray-800 border-t border-gray-700 px-4 py-2 text-xs text-gray-400 text-center">
        <span>Drag to pan • Ctrl + Scroll to zoom • Click arrows to navigate pages</span>
      </div>
    </div>
  );
}
