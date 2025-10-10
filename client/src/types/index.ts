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

export interface SearchResult {
  segment: TextSegment;
  relevance: number;
  highlightText: string;
}

export interface SearchResponse {
  keyword: string;
  expandedKeywords?: string[];
  results: SearchResult[];
  totalMatches: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
