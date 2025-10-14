export interface PDFDocument {
  id: string;
  filename: string;
  title: string;
  filepath: string;
  filesize: number;
  pageCount: number;
  uploadedAt: string;
  indexed: boolean;
  thumbnail?: string;
}

export interface TextSegment {
  id: string;
  pdfId: string;
  pageNumber: number;
  text: string;
  type: 'title' | 'table' | 'text';
  bbox: BBox;
  fontSize?: number;
  fontName?: string;
}

export interface BBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface KeywordMatch {
  keyword: string;
  startIndex: number;
  endIndex: number;
}

export interface SearchResult {
  segment: TextSegment;
  relevance: number;
  highlightText: string;
  matches: KeywordMatch[];
  ocrMatches?: OCRMatch[]; // For OCR results
}

export interface OCRMatch {
  text: string;
  confidence: number;
  bbox?: number[] | BBox; // Support both array [x,y,w,h] and object format
  position?: BBox; // Converted position for rendering
}

export interface OCRSearchResult {
  pageNumber: number;
  matches: OCRMatch[];
}

export interface SearchResponse {
  keyword: string;
  expandedKeywords?: string[];
  results: SearchResult[];
  totalMatches: number;
  ocrResults?: OCRSearchResult[];
  ocrMatches?: number;
  totalMatchesIncludingOCR?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
