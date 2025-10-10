export interface PDFDocument {
  id: string;
  filename: string;
  title: string;
  filepath: string;
  filesize: number;
  pageCount: number;
  uploadedAt: Date;
  indexed: boolean;
  thumbnail?: string;
}

export interface TextSegment {
  id: string;
  pdfId: string;
  pageNumber: number;
  text: string;
  type: 'title' | 'table' | 'text';
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  fontSize?: number;
  fontName?: string;
}

export interface SearchIndex {
  pdfId: string;
  segments: TextSegment[];
  lastIndexed: Date;
}
