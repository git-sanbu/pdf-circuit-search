import { Request, Response } from 'express';
import { dbService } from '../services/database.js';
import { pdfParser } from '../services/pdfParser.js';
import path from 'path';
import fs from 'fs/promises';
import { createReadStream } from 'fs';

export class PDFController {
  /**
   * GET /api/pdfs - 获取PDF列表
   */
  async listPDFs(req: Request, res: Response) {
    try {
      const pdfs = dbService.getAllPDFs();
      res.json({ success: true, data: pdfs });
    } catch (error) {
      console.error('List PDFs error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch PDFs' });
    }
  }

  /**
   * GET /api/pdfs/:id - 获取PDF详情
   */
  async getPDF(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const pdf = dbService.getPDFById(id);

      if (!pdf) {
        return res.status(404).json({ success: false, error: 'PDF not found' });
      }

      res.json({ success: true, data: pdf });
    } catch (error) {
      console.error('Get PDF error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch PDF' });
    }
  }

  /**
   * GET /api/pdfs/:id/file - 获取PDF文件流
   */
  async getPDFFile(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const pdf = dbService.getPDFById(id);

      if (!pdf) {
        return res.status(404).json({ success: false, error: 'PDF not found' });
      }

      const filepath = path.resolve(pdf.filepath);
      const stat = await fs.stat(filepath);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', stat.size);
      res.setHeader('Content-Disposition', `inline; filename="${pdf.filename}"`);
      res.setHeader('Accept-Ranges', 'bytes');

      const fileStream = createReadStream(filepath);
      fileStream.pipe(res);
    } catch (error) {
      console.error('Get PDF file error:', error);
      res.status(500).json({ success: false, error: 'Failed to serve PDF file' });
    }
  }

  /**
   * POST /api/pdfs/:id/index - 触发PDF索引
   */
  async indexPDF(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const pdf = dbService.getPDFById(id);

      if (!pdf) {
        return res.status(404).json({ success: false, error: 'PDF not found' });
      }

      if (pdf.indexed) {
        return res.json({ success: true, message: 'PDF already indexed', segmentCount: 0 });
      }

      // 解析PDF并提取文本
      console.log(`Indexing PDF: ${pdf.filename}`);
      const segments = await pdfParser.parsePDF(id, pdf.filepath);

      // 保存到数据库
      dbService.saveTextSegments(segments);
      dbService.updatePDFIndexStatus(id, true);

      console.log(`Indexed ${segments.length} segments from ${pdf.filename}`);

      res.json({
        success: true,
        message: 'PDF indexed successfully',
        segmentCount: segments.length
      });
    } catch (error) {
      console.error('Index PDF error:', error);
      res.status(500).json({ success: false, error: 'Failed to index PDF' });
    }
  }
}

export const pdfController = new PDFController();
