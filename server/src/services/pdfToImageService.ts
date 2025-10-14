import { createCanvas } from 'canvas';
import { createRequire } from 'module';
import fs from 'fs/promises';
import path from 'path';

// 使用 require 加载 pdfjs (CommonJS 模块)
const require = createRequire(import.meta.url);
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

// 初始化 pdf.js
pdfjsLib.GlobalWorkerOptions.workerSrc = '';

export interface PdfToImageOptions {
  scale?: number; // 缩放比例，默认 2.0
  format?: 'png' | 'jpeg'; // 图片格式
  quality?: number; // JPEG 质量 (0-1)
}

export interface PageImage {
  pageNumber: number;
  imagePath: string;
  width: number;
  height: number;
}

export class PdfToImageService {
  /**
   * 将 PDF 的每一页转换为图片
   * @param pdfPath PDF 文件路径
   * @param outputDir 输出目录
   * @param options 转换选项
   * @returns 生成的图片信息数组
   */
  async convertPdfToImages(
    pdfPath: string,
    outputDir?: string,
    options?: PdfToImageOptions
  ): Promise<PageImage[]> {
    const scale = options?.scale || 2.0;
    const format = options?.format || 'png';
    const quality = options?.quality || 0.95;

    // 如果未指定输出目录，使用 PDF 同目录
    const outputDirectory = outputDir || path.join(path.dirname(pdfPath), 'pdf_images');

    // 确保输出目录存在
    await fs.mkdir(outputDirectory, { recursive: true });

    // 读取 PDF 文件
    const pdfData = await fs.readFile(pdfPath);
    const uint8Array = new Uint8Array(pdfData);

    // 加载 PDF 文档
    const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
    const pdfDocument = await loadingTask.promise;

    const pageImages: PageImage[] = [];
    const totalPages = pdfDocument.numPages;

    console.log(`Converting PDF to images: ${totalPages} pages`);

    // 逐页转换
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      try {
        const page = await pdfDocument.getPage(pageNum);
        const viewport = page.getViewport({ scale });

        // 创建 Canvas
        const canvas = createCanvas(viewport.width, viewport.height);
        const context = canvas.getContext('2d');

        // 渲染 PDF 页面到 Canvas
        const renderContext = {
          canvasContext: context as any,
          viewport: viewport,
        };

        await page.render(renderContext).promise;

        // 生成输出文件名
        const basename = path.basename(pdfPath, '.pdf');
        const imageFilename = `${basename}_page_${pageNum}.${format}`;
        const imagePath = path.join(outputDirectory, imageFilename);

        // 保存图片
        if (format === 'png') {
          const buffer = canvas.toBuffer('image/png');
          await fs.writeFile(imagePath, buffer);
        } else {
          const buffer = canvas.toBuffer('image/jpeg', { quality });
          await fs.writeFile(imagePath, buffer);
        }

        pageImages.push({
          pageNumber: pageNum,
          imagePath,
          width: viewport.width,
          height: viewport.height,
        });

        console.log(`Page ${pageNum}/${totalPages} converted: ${imageFilename}`);
      } catch (error: any) {
        console.error(`Failed to convert page ${pageNum}:`, error.message);
        throw error;
      }
    }

    console.log(`PDF conversion completed: ${pageImages.length} images generated`);
    return pageImages;
  }

  /**
   * 将单个 PDF 页面转换为图片
   * @param pdfPath PDF 文件路径
   * @param pageNumber 页码（从 1 开始）
   * @param outputPath 输出文件路径
   * @param options 转换选项
   * @returns 生成的图片信息
   */
  async convertPageToImage(
    pdfPath: string,
    pageNumber: number,
    outputPath: string,
    options?: PdfToImageOptions
  ): Promise<PageImage> {
    const scale = options?.scale || 2.0;
    const format = options?.format || 'png';
    const quality = options?.quality || 0.95;

    // 读取 PDF 文件
    const pdfData = await fs.readFile(pdfPath);
    const uint8Array = new Uint8Array(pdfData);

    // 加载 PDF 文档
    const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
    const pdfDocument = await loadingTask.promise;

    if (pageNumber < 1 || pageNumber > pdfDocument.numPages) {
      throw new Error(`Invalid page number: ${pageNumber} (total pages: ${pdfDocument.numPages})`);
    }

    // 获取指定页面
    const page = await pdfDocument.getPage(pageNumber);
    const viewport = page.getViewport({ scale });

    // 创建 Canvas
    const canvas = createCanvas(viewport.width, viewport.height);
    const context = canvas.getContext('2d');

    // 渲染 PDF 页面到 Canvas
    const renderContext = {
      canvasContext: context as any,
      viewport: viewport,
    };

    await page.render(renderContext).promise;

    // 确保输出目录存在
    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    // 保存图片
    if (format === 'png') {
      const buffer = canvas.toBuffer('image/png');
      await fs.writeFile(outputPath, buffer);
    } else {
      const buffer = canvas.toBuffer('image/jpeg', { quality });
      await fs.writeFile(outputPath, buffer);
    }

    console.log(`Page ${pageNumber} converted to: ${outputPath}`);

    return {
      pageNumber,
      imagePath: outputPath,
      width: viewport.width,
      height: viewport.height,
    };
  }

  /**
   * 清理生成的图片文件
   * @param pageImages 图片信息数组
   */
  async cleanupImages(pageImages: PageImage[]): Promise<void> {
    for (const pageImage of pageImages) {
      try {
        await fs.unlink(pageImage.imagePath);
      } catch (error) {
        console.warn(`Failed to delete image: ${pageImage.imagePath}`);
      }
    }
  }
}

export const pdfToImageService = new PdfToImageService();
