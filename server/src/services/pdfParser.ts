import fs from 'fs/promises';
import pdfParse from 'pdf-parse';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { TextSegment } from '../models/PDFDocument.js';
import { v4 as uuidv4 } from 'uuid';

export class PDFParserService {
  /**
   * 解析PDF文件并提取文本片段
   */
  async parsePDF(pdfId: string, filepath: string): Promise<TextSegment[]> {
    const dataBuffer = await fs.readFile(filepath);

    // 使用pdfjs-dist进行详细解析
    const loadingTask = pdfjsLib.getDocument({
      data: dataBuffer,
      useSystemFonts: true,
    });
    const pdfDoc = await loadingTask.promise;

    const segments: TextSegment[] = [];

    // 逐页解析
    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const viewport = page.getViewport({ scale: 1.0 });

      // 提取文本项
      for (const item of textContent.items) {
        if ('str' in item && item.str.trim()) {
          const text = item.str.trim();
          const transform = item.transform;

          // 计算边界框
          const bbox = {
            x: transform[4],
            y: viewport.height - transform[5],
            width: item.width || 0,
            height: item.height || 0
          };

          // 计算字号
          const fontSize = Math.sqrt(
            transform[0] * transform[0] + transform[1] * transform[1]
          );

          // 推断文本类型
          const type = this.inferTextType(text, fontSize);

          segments.push({
            id: uuidv4(),
            pdfId,
            pageNumber: pageNum,
            text,
            type,
            bbox,
            fontSize,
            fontName: item.fontName
          });
        }
      }
    }

    return segments;
  }

  /**
   * 推断文本类型 (标题/表格/普通文本)
   */
  private inferTextType(text: string, fontSize: number): 'title' | 'table' | 'text' {
    // 标题判断: 字号大且内容较短
    if (fontSize > 16 && text.length < 100) {
      return 'title';
    }

    // 表格判断: 包含制表符或特殊字符或数字开头
    if (
      text.includes('\t') ||
      /^\s*[-|+]+\s*$/.test(text) ||
      /^\d+\.?\d*\s/.test(text) ||
      /[\u4e00-\u9fa5].*[:：]/.test(text) // 中文冒号可能是表格标题
    ) {
      return 'table';
    }

    return 'text';
  }

  /**
   * 获取PDF基本信息
   */
  async getPDFInfo(filepath: string): Promise<{ pageCount: number }> {
    const dataBuffer = await fs.readFile(filepath);
    const data = await pdfParse(dataBuffer);
    return {
      pageCount: data.numpages
    };
  }
}

export const pdfParser = new PDFParserService();
