import { PDFDocument } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export interface SplitPDFResult {
  chunks: Array<{
    path: string;
    startPage: number;
    endPage: number;
    pageCount: number;
    fileSizeMB: number;
  }>;
  totalPages: number;
  totalChunks: number;
}

export class PDFSplitter {
  /**
   * 将 PDF 分割成多个小文件
   * @param pdfPath PDF 文件路径
   * @param maxPages 每个分割文件的最大页数（默认 5 页，符合阿里云限制）
   * @param maxSizeMB 每个分割文件的最大大小（默认 8MB，留有余量）
   * @returns 分割后的文件信息
   */
  async splitPDF(
    pdfPath: string,
    maxPages: number = 5,
    maxSizeMB: number = 8
  ): Promise<SplitPDFResult> {
    console.log(`[PDFSplitter] Splitting PDF: ${path.basename(pdfPath)}`);
    console.log(`[PDFSplitter] Max pages per chunk: ${maxPages}, Max size: ${maxSizeMB}MB`);

    // 读取原始 PDF
    const pdfBytes = await fs.readFile(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const totalPages = pdfDoc.getPageCount();

    console.log(`[PDFSplitter] Total pages: ${totalPages}`);

    // 如果 PDF 本身就符合要求，不需要分割
    const fileSizeMB = pdfBytes.length / (1024 * 1024);
    if (totalPages <= maxPages && fileSizeMB <= maxSizeMB) {
      console.log(`[PDFSplitter] PDF is small enough, no splitting needed`);
      return {
        chunks: [{
          path: pdfPath,
          startPage: 1,
          endPage: totalPages,
          pageCount: totalPages,
          fileSizeMB: fileSizeMB,
        }],
        totalPages: totalPages,
        totalChunks: 1,
      };
    }

    // 创建临时目录存放分割后的文件
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdf-split-'));
    const baseName = path.basename(pdfPath, '.pdf');

    const chunks: SplitPDFResult['chunks'] = [];
    let chunkIndex = 0;

    // 按页数分割
    for (let startPage = 0; startPage < totalPages; startPage += maxPages) {
      const endPage = Math.min(startPage + maxPages, totalPages);
      const pageCount = endPage - startPage;

      console.log(`[PDFSplitter] Creating chunk ${chunkIndex + 1}: pages ${startPage + 1}-${endPage}`);

      // 创建新的 PDF 文档
      const newPdf = await PDFDocument.create();

      // 复制页面
      const copiedPages = await newPdf.copyPages(
        pdfDoc,
        Array.from({ length: pageCount }, (_, i) => startPage + i)
      );

      copiedPages.forEach((page) => {
        newPdf.addPage(page);
      });

      // 保存分割后的 PDF
      const chunkPath = path.join(tempDir, `${baseName}_chunk_${chunkIndex + 1}.pdf`);
      const chunkBytes = await newPdf.save();
      await fs.writeFile(chunkPath, chunkBytes);

      const chunkSizeMB = chunkBytes.length / (1024 * 1024);

      // 检查分割后的文件大小
      if (chunkSizeMB > maxSizeMB) {
        console.warn(`[PDFSplitter] Warning: Chunk ${chunkIndex + 1} size ${chunkSizeMB.toFixed(2)}MB exceeds ${maxSizeMB}MB`);
        console.warn(`[PDFSplitter] Consider reducing maxPages or using image-based OCR`);
      }

      chunks.push({
        path: chunkPath,
        startPage: startPage + 1,
        endPage: endPage,
        pageCount: pageCount,
        fileSizeMB: chunkSizeMB,
      });

      chunkIndex++;
    }

    console.log(`[PDFSplitter] Split into ${chunks.length} chunks`);

    return {
      chunks: chunks,
      totalPages: totalPages,
      totalChunks: chunks.length,
    };
  }

  /**
   * 清理分割后的临时文件
   * @param chunks 分割结果
   */
  async cleanup(chunks: SplitPDFResult['chunks']): Promise<void> {
    if (chunks.length === 0) return;

    // 获取临时目录
    const tempDir = path.dirname(chunks[0].path);

    // 只清理临时目录中的文件
    if (tempDir.includes('pdf-split-')) {
      console.log(`[PDFSplitter] Cleaning up ${chunks.length} chunk files`);
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (error) {
        console.error(`[PDFSplitter] Failed to cleanup:`, error);
      }
    }
  }
}

export const pdfSplitter = new PDFSplitter();
