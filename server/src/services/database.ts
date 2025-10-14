import Database from 'better-sqlite3';
import path from 'path';
import { PDFDocument, TextSegment } from '../models/PDFDocument.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = path.join(process.cwd(), 'data', 'app.db');
const db = new Database(dbPath);

// 初始化数据库表
db.exec(`
  CREATE TABLE IF NOT EXISTS pdfs (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    title TEXT NOT NULL,
    filepath TEXT NOT NULL,
    filesize INTEGER NOT NULL,
    pageCount INTEGER NOT NULL,
    uploadedAt TEXT NOT NULL,
    indexed INTEGER DEFAULT 0,
    thumbnail TEXT,
    fileHash TEXT,
    lastModified TEXT,
    ocrProcessed INTEGER DEFAULT 0,
    ocrProcessedAt TEXT
  );

  CREATE TABLE IF NOT EXISTS text_segments (
    id TEXT PRIMARY KEY,
    pdfId TEXT NOT NULL,
    pageNumber INTEGER NOT NULL,
    text TEXT NOT NULL,
    type TEXT NOT NULL,
    bbox TEXT NOT NULL,
    fontSize REAL,
    fontName TEXT,
    FOREIGN KEY (pdfId) REFERENCES pdfs(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS ocr_results (
    id TEXT PRIMARY KEY,
    pdfId TEXT NOT NULL,
    pageNumber INTEGER NOT NULL,
    ocrText TEXT NOT NULL,
    confidence REAL,
    textBlocks TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    FOREIGN KEY (pdfId) REFERENCES pdfs(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_segments_pdfId ON text_segments(pdfId);
  CREATE INDEX IF NOT EXISTS idx_segments_text ON text_segments(text);
  CREATE INDEX IF NOT EXISTS idx_segments_type ON text_segments(type);
  CREATE INDEX IF NOT EXISTS idx_ocr_pdfId ON ocr_results(pdfId);
  CREATE INDEX IF NOT EXISTS idx_ocr_page ON ocr_results(pageNumber);
  CREATE INDEX IF NOT EXISTS idx_pdfs_hash ON pdfs(fileHash);
`);

export class DatabaseService {
  // PDF文档操作
  getAllPDFs(): PDFDocument[] {
    const rows = db.prepare('SELECT * FROM pdfs ORDER BY uploadedAt DESC').all();
    return rows.map(this.rowToPDF);
  }

  getPDFById(id: string): PDFDocument | null {
    const row = db.prepare('SELECT * FROM pdfs WHERE id = ?').get(id);
    return row ? this.rowToPDF(row as any) : null;
  }

  savePDF(pdf: PDFDocument): void {
    db.prepare(`
      INSERT OR REPLACE INTO pdfs
      (id, filename, title, filepath, filesize, pageCount, uploadedAt, indexed, thumbnail)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      pdf.id,
      pdf.filename,
      pdf.title,
      pdf.filepath,
      pdf.filesize,
      pdf.pageCount,
      pdf.uploadedAt.toISOString(),
      pdf.indexed ? 1 : 0,
      pdf.thumbnail || null
    );
  }

  updatePDFIndexStatus(id: string, indexed: boolean): void {
    db.prepare('UPDATE pdfs SET indexed = ? WHERE id = ?').run(indexed ? 1 : 0, id);
  }

  deletePDF(id: string): void {
    db.prepare('DELETE FROM pdfs WHERE id = ?').run(id);
    db.prepare('DELETE FROM text_segments WHERE pdfId = ?').run(id);
    db.prepare('DELETE FROM ocr_results WHERE pdfId = ?').run(id);
  }

  // 文本片段操作
  saveTextSegments(segments: TextSegment[]): void {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO text_segments
      (id, pdfId, pageNumber, text, type, bbox, fontSize, fontName)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insert = db.transaction((segs: TextSegment[]) => {
      for (const seg of segs) {
        stmt.run(
          seg.id,
          seg.pdfId,
          seg.pageNumber,
          seg.text,
          seg.type,
          JSON.stringify(seg.bbox),
          seg.fontSize || null,
          seg.fontName || null
        );
      }
    });

    insert(segments);
  }

  getTextSegmentsByPDF(pdfId: string): TextSegment[] {
    const rows = db.prepare('SELECT * FROM text_segments WHERE pdfId = ? ORDER BY pageNumber').all(pdfId);
    return rows.map(this.rowToSegment);
  }

  searchSegments(pdfId: string, keyword: string): TextSegment[] {
    const rows = db.prepare(`
      SELECT * FROM text_segments
      WHERE pdfId = ? AND LOWER(text) LIKE LOWER(?)
      ORDER BY type, pageNumber
    `).all(pdfId, `%${keyword}%`);
    return rows.map(this.rowToSegment);
  }

  getAllSegments(pdfId: string, limit: number = 100): TextSegment[] {
    const rows = db.prepare(`
      SELECT * FROM text_segments
      WHERE pdfId = ?
      ORDER BY pageNumber, type
      LIMIT ?
    `).all(pdfId, limit);
    return rows.map(this.rowToSegment);
  }

  clearSegmentsByPDF(pdfId: string): void {
    db.prepare('DELETE FROM text_segments WHERE pdfId = ?').run(pdfId);
  }

  // OCR 结果操作
  saveOCRResult(ocrResult: OCRResult): void {
    db.prepare(`
      INSERT OR REPLACE INTO ocr_results
      (id, pdfId, pageNumber, ocrText, confidence, textBlocks, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      ocrResult.id,
      ocrResult.pdfId,
      ocrResult.pageNumber,
      ocrResult.ocrText,
      ocrResult.confidence || null,
      JSON.stringify(ocrResult.textBlocks),
      ocrResult.createdAt.toISOString()
    );
  }

  saveOCRResults(results: OCRResult[]): void {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO ocr_results
      (id, pdfId, pageNumber, ocrText, confidence, textBlocks, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insert = db.transaction((ocrs: OCRResult[]) => {
      for (const ocr of ocrs) {
        stmt.run(
          ocr.id,
          ocr.pdfId,
          ocr.pageNumber,
          ocr.ocrText,
          ocr.confidence || null,
          JSON.stringify(ocr.textBlocks),
          ocr.createdAt.toISOString()
        );
      }
    });

    insert(results);
  }

  getOCRResultsByPDF(pdfId: string): OCRResult[] {
    const rows = db.prepare('SELECT * FROM ocr_results WHERE pdfId = ? ORDER BY pageNumber').all(pdfId);
    return rows.map(this.rowToOCRResult);
  }

  getOCRResultByPage(pdfId: string, pageNumber: number): OCRResult | null {
    const row = db.prepare('SELECT * FROM ocr_results WHERE pdfId = ? AND pageNumber = ?').get(pdfId, pageNumber);
    return row ? this.rowToOCRResult(row as any) : null;
  }

  hasOCRResults(pdfId: string): boolean {
    const result = db.prepare('SELECT COUNT(*) as count FROM ocr_results WHERE pdfId = ?').get(pdfId) as any;
    return result.count > 0;
  }

  clearOCRResults(pdfId: string): void {
    db.prepare('DELETE FROM ocr_results WHERE pdfId = ?').run(pdfId);
  }

  // PDF 文件哈希和 OCR 状态操作
  updatePDFHash(id: string, fileHash: string, lastModified: Date): void {
    db.prepare('UPDATE pdfs SET fileHash = ?, lastModified = ? WHERE id = ?')
      .run(fileHash, lastModified.toISOString(), id);
  }

  updatePDFOCRStatus(id: string, processed: boolean): void {
    db.prepare('UPDATE pdfs SET ocrProcessed = ?, ocrProcessedAt = ? WHERE id = ?')
      .run(processed ? 1 : 0, processed ? new Date().toISOString() : null, id);
  }

  getPDFByHash(fileHash: string): PDFDocument | null {
    const row = db.prepare('SELECT * FROM pdfs WHERE fileHash = ?').get(fileHash);
    return row ? this.rowToPDF(row as any) : null;
  }

  // 搜索 OCR 结果中的关键词，返回带位置信息的文本块
  searchOCRResults(pdfId: string, keyword: string): SearchResult[] {
    const rows = db.prepare(`
      SELECT * FROM ocr_results
      WHERE pdfId = ? AND LOWER(ocrText) LIKE LOWER(?)
      ORDER BY pageNumber
    `).all(pdfId, `%${keyword}%`);

    const results: SearchResult[] = [];

    for (const row of rows as any[]) {
      const ocrResult = this.rowToOCRResult(row);
      const textBlocks = ocrResult.textBlocks.filter(block =>
        block.text.toLowerCase().includes(keyword.toLowerCase())
      );

      if (textBlocks.length > 0) {
        results.push({
          pageNumber: ocrResult.pageNumber,
          matches: textBlocks.map(block => ({
            text: block.text,
            bbox: block.bbox,
            confidence: block.confidence,
          })),
        });
      }
    }

    return results;
  }

  // 辅助方法
  private rowToPDF(row: any): PDFDocument {
    return {
      id: row.id,
      filename: row.filename,
      title: row.title,
      filepath: row.filepath,
      filesize: row.filesize,
      pageCount: row.pageCount,
      uploadedAt: new Date(row.uploadedAt),
      indexed: row.indexed === 1,
      thumbnail: row.thumbnail,
      fileHash: row.fileHash,
      lastModified: row.lastModified ? new Date(row.lastModified) : undefined,
      ocrProcessed: row.ocrProcessed === 1,
      ocrProcessedAt: row.ocrProcessedAt ? new Date(row.ocrProcessedAt) : undefined,
    };
  }

  private rowToSegment(row: any): TextSegment {
    return {
      id: row.id,
      pdfId: row.pdfId,
      pageNumber: row.pageNumber,
      text: row.text,
      type: row.type as 'title' | 'table' | 'text',
      bbox: JSON.parse(row.bbox),
      fontSize: row.fontSize,
      fontName: row.fontName
    };
  }

  private rowToOCRResult(row: any): OCRResult {
    return {
      id: row.id,
      pdfId: row.pdfId,
      pageNumber: row.pageNumber,
      ocrText: row.ocrText,
      confidence: row.confidence,
      textBlocks: JSON.parse(row.textBlocks),
      createdAt: new Date(row.createdAt),
    };
  }
}

// 类型定义
export interface OCRResult {
  id: string;
  pdfId: string;
  pageNumber: number;
  ocrText: string;
  confidence?: number;
  textBlocks: TextBlock[];
  createdAt: Date;
}

export interface TextBlock {
  text: string;
  bbox: [number, number, number, number]; // [x, y, width, height]
  confidence?: number;
}

export interface SearchResult {
  pageNumber: number;
  matches: Array<{
    text: string;
    bbox: [number, number, number, number];
    confidence?: number;
  }>;
}

export const dbService = new DatabaseService();
