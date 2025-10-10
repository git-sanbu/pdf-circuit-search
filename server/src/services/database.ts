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
    thumbnail TEXT
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

  CREATE INDEX IF NOT EXISTS idx_segments_pdfId ON text_segments(pdfId);
  CREATE INDEX IF NOT EXISTS idx_segments_text ON text_segments(text);
  CREATE INDEX IF NOT EXISTS idx_segments_type ON text_segments(type);
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
      WHERE pdfId = ? AND text LIKE ?
      ORDER BY type, pageNumber
    `).all(pdfId, `%${keyword}%`);
    return rows.map(this.rowToSegment);
  }

  clearSegmentsByPDF(pdfId: string): void {
    db.prepare('DELETE FROM text_segments WHERE pdfId = ?').run(pdfId);
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
      thumbnail: row.thumbnail
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
}

export const dbService = new DatabaseService();
