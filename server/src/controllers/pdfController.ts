import { Request, Response } from 'express';
import { dbService } from '../services/database.js';
import { pdfParser } from '../services/pdfParser.js';
import { ocrService } from '../services/ocrService.js';
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
      res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(pdf.filename)}`);
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
      const { enableOCR = true } = req.body; // 允许客户端控制是否使用 OCR

      const pdf = dbService.getPDFById(id);

      if (!pdf) {
        return res.status(404).json({ success: false, error: 'PDF not found' });
      }

      if (pdf.indexed) {
        return res.json({ success: true, message: 'PDF already indexed', segmentCount: 0 });
      }

      console.log(`Indexing PDF: ${pdf.filename}`);

      // 步骤 1: OCR 预处理（如果启用）
      let pdfPathToProcess = pdf.filepath;
      let ocrProcessed = false;

      if (enableOCR) {
        console.log('Running OCR preprocessing...');
        try {
          const ocrOptions = {
            enabled: true,
            language: process.env.OCR_LANGUAGE || 'eng+chi_sim',
            deskew: process.env.OCR_DESKEW !== 'false',
            rotatePages: process.env.OCR_ROTATE_PAGES !== 'false',
            skipText: process.env.OCR_SKIP_TEXT !== 'false',
          };

          const processedPath = await ocrService.preprocessPDF(
            pdf.filepath,
            undefined,
            ocrOptions
          );

          // 如果 OCR 生成了新文件，使用它
          if (processedPath !== pdf.filepath) {
            pdfPathToProcess = processedPath;
            ocrProcessed = true;
            console.log('OCR preprocessing successful');
          }
        } catch (ocrError) {
          console.warn('OCR preprocessing failed, continuing with original file:', ocrError);
        }
      }

      // 步骤 2: 解析PDF并提取文本
      console.log('Parsing PDF and extracting text...');
      const segments = await pdfParser.parsePDF(id, pdfPathToProcess);

      // 步骤 3: 保存到数据库
      dbService.saveTextSegments(segments);
      dbService.updatePDFIndexStatus(id, true);

      console.log(`Indexed ${segments.length} segments from ${pdf.filename}`);

      // 步骤 4: 清理临时文件（如果有）
      if (ocrProcessed && pdfPathToProcess !== pdf.filepath) {
        try {
          // 可选：保留 OCR 处理后的文件，或删除它
          // await fs.unlink(pdfPathToProcess);
          console.log('Keeping OCR-processed file for future use');
        } catch (cleanupError) {
          console.warn('Failed to cleanup OCR temporary file:', cleanupError);
        }
      }

      res.json({
        success: true,
        message: 'PDF indexed successfully',
        segmentCount: segments.length,
        ocrProcessed,
      });
    } catch (error) {
      console.error('Index PDF error:', error);
      res.status(500).json({ success: false, error: 'Failed to index PDF' });
    }
  }
}

export const pdfController = new PDFController();
