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
  const textLayerRef = useRef<HTMLDivElement>(null);
  const highlightLayerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<any>(null);

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
      // Cancel any ongoing render task
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }

      setIsRendering(true);
      try {
        const page = await pdfDoc.getPage(currentPage);
        const canvas = canvasRef.current!;
        const context = canvas.getContext('2d')!;
        const textLayer = textLayerRef.current!;
        const highlightLayer = highlightLayerRef.current!;

        const viewport = page.getViewport({ scale, rotation });

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // Render PDF page
        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        renderTaskRef.current = page.render(renderContext);
        await renderTaskRef.current.promise;
        renderTaskRef.current = null;

        // Get text content
        const textContent = await page.getTextContent();

        // Clear previous highlights
        highlightLayer.innerHTML = '';
        highlightLayer.style.width = `${viewport.width}px`;
        highlightLayer.style.height = `${viewport.height}px`;

        // Draw highlights if current result matches this page
        if (currentResult && currentResult.segment.pageNumber === currentPage) {
          console.log('[PDFViewer] Highlighting on page', currentPage);
          console.log('[PDFViewer] currentResult:', currentResult);

          // If it's an OCR result with multiple matches
          if (currentResult.ocrMatches && currentResult.ocrMatches.length > 0) {
            console.log('[PDFViewer] Drawing OCR highlights:', currentResult.ocrMatches.length, 'matches');

            // OCR coordinates are from high-res images, need to be scaled to PDF coordinates
            // Estimate the scale based on typical PDF-to-image conversion ratios
            // Most PDFs are converted at 200-300 DPI, resulting in roughly 2-4x scale

            currentResult.ocrMatches.forEach((match, idx) => {
              if (match.position) {
                // Try to draw OCR highlight with coordinate conversion
                drawOCRHighlight(context, match.position, viewport);
              }
            });
          } else if (currentResult.matches && currentResult.matches.length > 0) {
            // Highlight keywords in PDF text using text layer
            console.log('[PDFViewer] Using text layer highlights:', currentResult.matches.length, 'matches');
            console.log('[PDFViewer] Text content items:', textContent.items.length);
            highlightKeywordsInText(textContent, currentResult.matches, viewport, highlightLayer, currentResult.segment.text);
          } else {
            console.log('[PDFViewer] No matches to highlight');
          }
        }
      } catch (error) {
        console.error('Error rendering page:', error);
      } finally {
        setIsRendering(false);
      }
    };

    renderPage();

    // Cleanup function to cancel render task on unmount or re-render
    return () => {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
    };
  }, [pdfDoc, currentPage, scale, rotation, currentResult]);

  // Navigate to page when search result changes
  useEffect(() => {
    if (currentResult) {
      setCurrentPage(currentResult.segment.pageNumber);
    }
  }, [currentResult]);

  const drawHighlight = (ctx: CanvasRenderingContext2D, bbox: BBox, viewport: any, isOCR: boolean = false) => {
    const { x, y, width, height } = bbox;

    // Transform PDF coordinates to canvas coordinates
    const [canvasX, canvasY] = viewport.convertToViewportPoint(x, y);
    const [canvasX2, canvasY2] = viewport.convertToViewportPoint(x + width, y + height);

    const canvasWidth = canvasX2 - canvasX;
    const canvasHeight = canvasY2 - canvasY;

    if (isOCR) {
      // OCR highlights in green
      ctx.fillStyle = 'rgba(74, 222, 128, 0.3)';
      ctx.fillRect(canvasX, canvasY, canvasWidth, canvasHeight);
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.8)';
      ctx.lineWidth = 2;
      ctx.strokeRect(canvasX, canvasY, canvasWidth, canvasHeight);
    } else {
      // PDF text highlights in yellow
      ctx.fillStyle = 'rgba(255, 255, 0, 0.4)';
      ctx.fillRect(canvasX, canvasY, canvasWidth, canvasHeight);
      ctx.strokeStyle = 'rgba(255, 200, 0, 0.8)';
      ctx.lineWidth = 2;
      ctx.strokeRect(canvasX, canvasY, canvasWidth, canvasHeight);
    }
  };

  const drawOCRHighlight = (ctx: CanvasRenderingContext2D, imageBBox: BBox, viewport: any) => {
    // OCR bbox is in image coordinates, need to convert to PDF coordinates
    // PDF-to-image conversion uses scale=2.0, so image_coord = pdf_coord * 2.0
    // Therefore: pdf_coord = image_coord / 2.0

    const IMAGE_TO_PDF_SCALE = 2.0;

    // Get PDF page dimensions (in points, at scale 1.0)
    const pageWidth = viewport.width / viewport.scale;
    const pageHeight = viewport.height / viewport.scale;

    console.log('[drawOCRHighlight] Image bbox:', imageBBox);
    console.log('[drawOCRHighlight] PDF page size (scale 1):', pageWidth, 'x', pageHeight);

    // Convert image coordinates to PDF coordinates
    const pdfX = imageBBox.x / IMAGE_TO_PDF_SCALE;
    const pdfWidth = imageBBox.width / IMAGE_TO_PDF_SCALE;
    const pdfHeight = imageBBox.height / IMAGE_TO_PDF_SCALE;

    // PDF Y-axis is bottom-up, image Y-axis is top-down
    // Need to flip Y coordinate: pdfY = pageHeight - (imageY / scale) - height
    const pdfY = pageHeight - (imageBBox.y / IMAGE_TO_PDF_SCALE) - pdfHeight;

    console.log('[drawOCRHighlight] Converted to PDF coords:', { x: pdfX, y: pdfY, width: pdfWidth, height: pdfHeight });

    // Transform to viewport coordinates
    const [canvasX, canvasY] = viewport.convertToViewportPoint(pdfX, pdfY);
    const [canvasX2, canvasY2] = viewport.convertToViewportPoint(pdfX + pdfWidth, pdfY + pdfHeight);

    const canvasWidth = canvasX2 - canvasX;
    const canvasHeight = canvasY2 - canvasY;

    console.log('[drawOCRHighlight] Canvas position:', { x: canvasX, y: canvasY, width: canvasWidth, height: canvasHeight });

    // Draw green highlight for OCR
    ctx.fillStyle = 'rgba(74, 222, 128, 0.3)';
    ctx.fillRect(canvasX, canvasY, canvasWidth, canvasHeight);
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.8)';
    ctx.lineWidth = 2;
    ctx.strokeRect(canvasX, canvasY, canvasWidth, canvasHeight);
  };

  const highlightKeywordsInText = (textContent: any, matches: any[], viewport: any, highlightLayer: HTMLDivElement, segmentText: string) => {
    if (!matches || matches.length === 0) {
      console.log('[highlightKeywordsInText] No matches provided');
      return;
    }

    // Build full text from textContent items
    let fullText = '';
    const textItems = textContent.items;
    const textPositions: Array<{ startIndex: number; endIndex: number; item: any }> = [];

    textItems.forEach((item: any) => {
      const startIndex = fullText.length;
      const text = item.str;
      fullText += text;
      const endIndex = fullText.length;
      textPositions.push({ startIndex, endIndex, item });
    });

    console.log('[highlightKeywordsInText] Full text length:', fullText.length);
    console.log('[highlightKeywordsInText] Full text preview:', fullText.substring(0, 100));
    console.log('[highlightKeywordsInText] Segment text:', segmentText);
    console.log('[highlightKeywordsInText] Matches to highlight:', matches);

    // Find the segment text in the full page text
    const segmentStartIndex = fullText.indexOf(segmentText);
    if (segmentStartIndex === -1) {
      console.warn('[highlightKeywordsInText] Could not find segment text in page text');
      console.warn('[highlightKeywordsInText] Segment:', segmentText);
      console.warn('[highlightKeywordsInText] Page text:', fullText);
      return;
    }

    console.log('[highlightKeywordsInText] Segment starts at index', segmentStartIndex, 'in page text');

    let highlightCount = 0;

    // For each keyword match, find corresponding text items and highlight them
    matches.forEach(match => {
      // Adjust the match indices to be relative to the full page text
      const pageStartIndex = segmentStartIndex + match.startIndex;
      const pageEndIndex = segmentStartIndex + match.endIndex;

      console.log('[highlightKeywordsInText] Match in segment:', match.startIndex, '-', match.endIndex);
      console.log('[highlightKeywordsInText] Adjusted to page:', pageStartIndex, '-', pageEndIndex, ':', fullText.substring(pageStartIndex, pageEndIndex));

      // Find text items that overlap with this match
      textPositions.forEach(({ startIndex: itemStart, endIndex: itemEnd, item }) => {
        // Check if this text item overlaps with the match (using adjusted indices)
        if (itemStart < pageEndIndex && itemEnd > pageStartIndex) {
          // Calculate overlap (using adjusted indices)
          const overlapStart = Math.max(itemStart, pageStartIndex);
          const overlapEnd = Math.min(itemEnd, pageEndIndex);

          if (overlapStart < overlapEnd && item.transform) {
            // Get position from PDF.js text item
            const tx = item.transform[4];
            const ty = item.transform[5];
            const itemWidth = item.width;
            const itemHeight = item.height || 12; // Fallback height

            // Convert to viewport coordinates
            const [x, y] = viewport.convertToViewportPoint(tx, ty);

            console.log('[highlightKeywordsInText] Creating highlight at', x, y, 'size:', itemWidth * viewport.scale, 'x', itemHeight);

            // Create highlight div
            const highlightDiv = document.createElement('div');
            highlightDiv.style.position = 'absolute';
            highlightDiv.style.left = `${x}px`;
            highlightDiv.style.top = `${y - itemHeight}px`;
            highlightDiv.style.width = `${itemWidth * viewport.scale}px`;
            highlightDiv.style.height = `${itemHeight}px`;
            highlightDiv.style.backgroundColor = 'rgba(255, 255, 0, 0.4)';
            highlightDiv.style.border = '1px solid rgba(255, 200, 0, 0.8)';
            highlightDiv.style.pointerEvents = 'none';
            highlightDiv.style.mixBlendMode = 'multiply';

            highlightLayer.appendChild(highlightDiv);
            highlightCount++;
          }
        }
      });
    });

    console.log('[highlightKeywordsInText] Created', highlightCount, 'highlight divs');
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
          className="inline-block m-4 relative"
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
          {/* Highlight layer for keyword highlighting */}
          <div
            ref={highlightLayerRef}
            className="absolute top-0 left-0 pointer-events-none"
            style={{
              display: isRendering ? 'none' : 'block',
            }}
          />
          {/* Hidden text layer ref */}
          <div ref={textLayerRef} style={{ display: 'none' }} />
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
