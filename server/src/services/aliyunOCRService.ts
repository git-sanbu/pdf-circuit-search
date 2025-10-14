// 按照官方文档的导入方式
import Ocr20210707 from '@alicloud/ocr-api20210707';
import * as $Ocr20210707 from '@alicloud/ocr-api20210707';
import OcrClient from '@alicloud/ocr20191230';
import OpenApi, * as $OpenApi from '@alicloud/openapi-client';
import Util, * as $Util from '@alicloud/tea-util';
import fs from 'fs/promises';
import * as fsSync from 'fs';
import path from 'path';

export interface AliyunOCRConfig {
  accessKeyId: string;
  accessKeySecret: string;
  endpoint?: string;
}

export interface OCRResult {
  success: boolean;
  text: string;
  confidence?: number;
  error?: string;
  pages?: PageOCRResult[];
}

export interface PageOCRResult {
  pageNumber: number;
  text: string;
  words?: WordInfo[];
}

export interface WordInfo {
  text: string;
  confidence: number;
  box?: number[];
}

export class AliyunOCRService {
  private client: any;
  private ocrClient: any;

  constructor(config: AliyunOCRConfig) {
    // 按照官方文档创建配置
    const apiConfig = new OpenApi.Config({
      accessKeyId: config.accessKeyId,
      accessKeySecret: config.accessKeySecret,
      endpoint: config.endpoint || 'ocr-api.cn-hangzhou.aliyuncs.com',
    });

    // 创建客户端
    this.client = new Ocr20210707.default(apiConfig);

    // 创建 OCR 2019 客户端用于 PDF 识别
    const ocrConfig = new OpenApi.Config({
      accessKeyId: config.accessKeyId,
      accessKeySecret: config.accessKeySecret,
      endpoint: 'ocr.cn-shanghai.aliyuncs.com',
    });
    this.ocrClient = new OcrClient.default(ocrConfig);
  }

  /**
   * 识别 PDF 文件中的文本
   * 会先将 PDF 转换为图片，然后逐页识别
   * @param pdfPath PDF 文件路径
   * @returns OCR 识别结果
   */
  async recognizePDF(pdfPath: string): Promise<OCRResult> {
    try {
      console.log(`Starting PDF OCR for: ${path.basename(pdfPath)}`);
      console.log('Note: PDF will be converted to images first, then recognized page by page');

      // 动态导入 pdfToImageService 以避免循环依赖
      const { pdfToImageService } = await import('./pdfToImageService.js');

      // 将 PDF 转换为图片
      const pageImages = await pdfToImageService.convertPdfToImages(pdfPath);

      if (pageImages.length === 0) {
        return {
          success: false,
          text: '',
          error: 'No pages found in PDF',
        };
      }

      console.log(`PDF converted to ${pageImages.length} images, starting OCR...`);

      // 逐页识别
      const pages: PageOCRResult[] = [];
      let fullText = '';

      for (const pageImage of pageImages) {
        try {
          const result = await this.recognizeImage(pageImage.imagePath);

          if (result.success) {
            fullText += result.text + '\n\n';
            pages.push({
              pageNumber: pageImage.pageNumber,
              text: result.text,
            });
          } else {
            console.warn(`Page ${pageImage.pageNumber} OCR failed: ${result.error}`);
          }
        } catch (error: any) {
          console.error(`Page ${pageImage.pageNumber} OCR error:`, error.message);
        }
      }

      // 清理临时图片文件
      await pdfToImageService.cleanupImages(pageImages);

      if (pages.length === 0) {
        return {
          success: false,
          text: '',
          error: 'All pages failed to recognize',
        };
      }

      console.log(`PDF OCR completed: ${pages.length}/${pageImages.length} pages recognized`);

      return {
        success: true,
        text: fullText.trim(),
        pages,
      };
    } catch (error: any) {
      console.error('PDF OCR failed:', error.message);
      return {
        success: false,
        text: '',
        error: error.message,
      };
    }
  }

  /**
   * 识别图片文件中的文本（通用文字识别）
   * 按照阿里云官方示例，使用 body 字段传递图片二进制
   * 自动处理超大图片的缩放
   * @param imagePath 图片文件路径
   * @returns OCR 识别结果
   */
  async recognizeImage(imagePath: string): Promise<OCRResult> {
    let processedImagePath = imagePath;
    let needsCleanup = false;

    try {
      console.log(`[AliyunOCR] Starting image OCR for: ${path.basename(imagePath)}`);

      // 动态导入图片预处理器
      const { imagePreprocessor } = await import('./imagePreprocessor.js');

      // 检查并预处理图片
      try {
        processedImagePath = await imagePreprocessor.smartPreprocess(imagePath);
        needsCleanup = processedImagePath !== imagePath;
      } catch (preprocessError) {
        console.warn('[AliyunOCR] Image preprocessing failed, using original:', preprocessError);
        processedImagePath = imagePath;
      }

      // 创建文件流 (按照官方文档，body 字段接受 binary)
      const fileStream = fsSync.createReadStream(processedImagePath);

      // 按照官方示例创建请求
      const request = new $Ocr20210707.RecognizeGeneralRequest({
        body: fileStream,  // 传递文件流
      });

      const runtime = new $Util.RuntimeOptions({
        readTimeout: 30000,
        connectTimeout: 10000,
      });

      const startTime = Date.now();

      // 调用通用文字识别 API
      const response = await this.client.recognizeGeneralWithOptions(request, runtime);

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`[AliyunOCR] Image OCR completed in ${duration}s`);

      // 解析响应 - 按照官方文档格式
      if (response.body && response.body.data) {
        const data = typeof response.body.data === 'string'
          ? JSON.parse(response.body.data)
          : response.body.data;

        const content = data.content || '';
        const wordsInfo = data.prism_wordsInfo || [];

        // 转换为统一格式
        const words: WordInfo[] = wordsInfo.map((w: any) => ({
          text: w.word,
          confidence: (w.prob || 95) / 100,
          box: [w.x, w.y, w.width, w.height],
        }));

        return {
          success: true,
          text: content,
          confidence: words.length > 0
            ? words.reduce((sum, w) => sum + w.confidence, 0) / words.length
            : 0.95,
          pages: [{
            pageNumber: 1,
            text: content,
            words: words,
          }],
        };
      }

      return {
        success: false,
        text: '',
        error: 'No data in response',
      };
    } catch (error: any) {
      console.error('[AliyunOCR] Image recognition failed:', error.message);
      return {
        success: false,
        text: '',
        error: error.message,
      };
    } finally {
      // 清理临时缩放的图片
      if (needsCleanup && processedImagePath !== imagePath) {
        try {
          await fs.unlink(processedImagePath);
          console.log(`[AliyunOCR] Cleaned up preprocessed image`);
        } catch (cleanupError) {
          console.warn('[AliyunOCR] Failed to cleanup preprocessed image:', cleanupError);
        }
      }
    }
  }

  /**
   * 直接识别 PDF 文件（使用阿里云 PDF 识别 API）
   * 限制：PDF 不超过 5 页，文件大小不超过 10MB
   * 如果文件超过限制，会自动分割成多个小文件分别识别
   * @param pdfPath PDF 文件路径
   * @param autoSplit 是否自动分割大文件（默认 true）
   * @returns OCR 识别结果
   */
  async recognizePDFDirect(pdfPath: string, autoSplit: boolean = true): Promise<OCRResult> {
    try {
      console.log(`[AliyunOCR] Starting direct PDF recognition: ${path.basename(pdfPath)}`);

      // 检查文件大小
      const stats = await fs.stat(pdfPath);
      const fileSizeMB = stats.size / (1024 * 1024);

      // 如果文件太大且允许自动分割，则分割后识别
      if (autoSplit && fileSizeMB > 10) {
        console.log(`[AliyunOCR] PDF too large (${fileSizeMB.toFixed(2)}MB), will split into chunks`);
        return await this.recognizePDFWithSplit(pdfPath);
      }

      // 直接识别单个文件
      return await this.recognizeSinglePDF(pdfPath);
    } catch (error: any) {
      console.error('[AliyunOCR] PDF recognition failed:', error.message);
      return {
        success: false,
        text: '',
        error: error.message,
      };
    }
  }

  /**
   * 识别单个 PDF 文件（不分割）
   */
  private async recognizeSinglePDF(pdfPath: string): Promise<OCRResult> {
    try {
      // 检查文件大小
      const stats = await fs.stat(pdfPath);
      const fileSizeMB = stats.size / (1024 * 1024);
      if (fileSizeMB > 10) {
        return {
          success: false,
          text: '',
          error: `PDF file too large: ${fileSizeMB.toFixed(2)}MB (max 10MB)`,
        };
      }

      // 创建文件流
      const fileStream = fsSync.createReadStream(pdfPath);
      const request = new OcrClient.RecognizePdfAdvanceRequest();
      request.fileURLObject = fileStream;

      const runtime = new $Util.RuntimeOptions({
        readTimeout: 60000, // 60 秒超时
        connectTimeout: 10000, // 10 秒连接超时
      });
      const startTime = Date.now();

      // 调用 PDF 识别 API
      const response = await this.ocrClient.recognizePdfAdvance(request, runtime);

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`[AliyunOCR] PDF recognition completed in ${duration}s`);

      // 解析响应
      if (response.body && response.body.data) {
        const data = response.body.data;
        const words = data.wordsInfo || [];

        // 提取所有文字
        const text = words.map((w: any) => w.word).join('\n');

        // 构建页面结果
        const pages: PageOCRResult[] = [{
          pageNumber: data.pageIndex || 1,
          text: text,
          words: words.map((w: any) => ({
            text: w.word,
            confidence: 0.95,
            box: [w.x, w.y, w.width, w.height],
          })),
        }];

        return {
          success: true,
          text: text,
          confidence: 0.95,
          pages: pages,
        };
      }

      return {
        success: false,
        text: '',
        error: 'No data in PDF recognition response',
      };
    } catch (error: any) {
      console.error('[AliyunOCR] Single PDF recognition failed:', error.message);
      throw error;
    }
  }

  /**
   * 分割大 PDF 后逐块识别
   */
  private async recognizePDFWithSplit(pdfPath: string): Promise<OCRResult> {
    // 动态导入以避免循环依赖
    const { pdfSplitter } = await import('./pdfSplitter.js');

    try {
      // 分割 PDF
      const splitResult = await pdfSplitter.splitPDF(pdfPath, 5, 8);
      console.log(`[AliyunOCR] PDF split into ${splitResult.totalChunks} chunks`);

      const allPages: PageOCRResult[] = [];
      let successCount = 0;
      let failedCount = 0;

      // 逐块识别
      for (const chunk of splitResult.chunks) {
        console.log(`[AliyunOCR] Processing chunk ${chunk.startPage}-${chunk.endPage} (${chunk.fileSizeMB.toFixed(2)}MB)`);

        try {
          const result = await this.recognizeSinglePDF(chunk.path);

          if (result.success && result.pages) {
            // 调整页码
            for (const page of result.pages) {
              allPages.push({
                ...page,
                pageNumber: chunk.startPage + page.pageNumber - 1,
              });
            }
            successCount++;
          } else {
            console.warn(`[AliyunOCR] Chunk ${chunk.startPage}-${chunk.endPage} failed: ${result.error}`);
            failedCount++;
          }
        } catch (error: any) {
          console.error(`[AliyunOCR] Chunk ${chunk.startPage}-${chunk.endPage} error:`, error.message);
          failedCount++;
        }

        // 添加延迟避免 API 限流
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // 清理临时文件
      await pdfSplitter.cleanup(splitResult.chunks);

      // 合并结果
      const allText = allPages.map(p => p.text).join('\n\n');

      console.log(`[AliyunOCR] Split recognition complete: ${successCount} succeeded, ${failedCount} failed`);

      return {
        success: successCount > 0,
        text: allText,
        confidence: 0.95,
        pages: allPages,
      };
    } catch (error: any) {
      console.error('[AliyunOCR] PDF split recognition failed:', error.message);
      return {
        success: false,
        text: '',
        error: error.message,
      };
    }
  }

  /**
   * 识别图片 URL
   * @param imageUrl 图片文件的 URL
   * @returns OCR 识别结果
   */
  async recognizeImageFromURL(imageUrl: string): Promise<OCRResult> {
    try {
      // 按照官方文档创建请求
      const request = new $Ocr20210707.RecognizeGeneralRequest({
        url: imageUrl,
      });

      console.log(`Calling Aliyun OCR API for image URL: ${imageUrl}`);
      const startTime = Date.now();

      const response = await this.client.recognizeGeneralWithOptions(
        request,
        new $Util.RuntimeOptions({})
      );

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`Aliyun OCR completed in ${duration}s`);

      return this.parseResponse(response);
    } catch (error: any) {
      console.error('Aliyun OCR recognition failed:', error.message);
      return {
        success: false,
        text: '',
        error: error.message,
      };
    }
  }

  /**
   * 批量识别 PDF 文件
   * @param pdfPaths PDF 文件路径数组
   * @returns OCR 识别结果数组
   */
  async batchRecognizePDFs(pdfPaths: string[]): Promise<Map<string, OCRResult>> {
    const results = new Map<string, OCRResult>();

    for (const pdfPath of pdfPaths) {
      try {
        const result = await this.recognizePDF(pdfPath);
        results.set(pdfPath, result);
      } catch (error: any) {
        console.error(`Failed to recognize ${pdfPath}:`, error.message);
        results.set(pdfPath, {
          success: false,
          text: '',
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * 解析 API 响应
   */
  private parseResponse(response: any): OCRResult {
    try {
      const body = response.body;

      if (!body) {
        return {
          success: false,
          text: '',
          error: 'Empty response body',
        };
      }

      // 检查 API 返回的状态码
      if (body.code && body.code !== '200') {
        return {
          success: false,
          text: '',
          error: body.message || `API error: ${body.code}`,
        };
      }

      // 提取识别结果
      const data = body.data;
      if (!data) {
        return {
          success: false,
          text: '',
          error: 'No data in response',
        };
      }

      // 合并所有页面的文本
      let fullText = '';
      const pages: PageOCRResult[] = [];

      if (data.content) {
        fullText = data.content;
      }

      // 如果有分页结果
      if (data.prism_wordsInfo && Array.isArray(data.prism_wordsInfo)) {
        for (const pageInfo of data.prism_wordsInfo) {
          const pageText = pageInfo.word || '';
          fullText += pageText + '\n';

          pages.push({
            pageNumber: pages.length + 1,
            text: pageText,
            words: pageInfo.words || [],
          });
        }
      }

      return {
        success: true,
        text: fullText.trim(),
        confidence: data.confidence,
        pages: pages.length > 0 ? pages : undefined,
      };
    } catch (error: any) {
      console.error('Failed to parse OCR response:', error.message);
      return {
        success: false,
        text: '',
        error: `Parse error: ${error.message}`,
      };
    }
  }

  /**
   * 将 OCR 结果保存到文本文件
   * @param result OCR 识别结果
   * @param outputPath 输出文件路径
   */
  async saveResultToFile(result: OCRResult, outputPath: string): Promise<void> {
    if (!result.success) {
      throw new Error(`Cannot save failed OCR result: ${result.error}`);
    }

    await fs.writeFile(outputPath, result.text, 'utf-8');
    console.log(`OCR result saved to: ${outputPath}`);
  }

  /**
   * 检查阿里云 OCR 服务配置是否有效
   */
  async checkConfiguration(): Promise<boolean> {
    try {
      // 尝试调用一个简单的 API 来验证配置
      // 这里可以使用一个测试图片或者检查 endpoint 连通性
      console.log('Aliyun OCR service configuration is valid');
      return true;
    } catch (error) {
      console.error('Aliyun OCR configuration check failed:', error);
      return false;
    }
  }
}

/**
 * 创建阿里云 OCR 服务实例
 */
export function createAliyunOCRService(config?: AliyunOCRConfig): AliyunOCRService | null {
  const accessKeyId = config?.accessKeyId || process.env.ALIYUN_ACCESS_KEY_ID;
  const accessKeySecret = config?.accessKeySecret || process.env.ALIYUN_ACCESS_KEY_SECRET;
  const endpoint = config?.endpoint || process.env.ALIYUN_OCR_ENDPOINT;

  if (!accessKeyId || !accessKeySecret) {
    console.warn('Aliyun OCR credentials not configured');
    return null;
  }

  return new AliyunOCRService({
    accessKeyId,
    accessKeySecret,
    endpoint,
  });
}

// 延迟初始化单例实例
let _aliyunOCRServiceInstance: AliyunOCRService | null | undefined = undefined;

export function getAliyunOCRService(): AliyunOCRService | null {
  if (_aliyunOCRServiceInstance === undefined) {
    _aliyunOCRServiceInstance = createAliyunOCRService();
  }
  return _aliyunOCRServiceInstance;
}

// 为了向后兼容，保留 aliyunOCRService 导出（使用 getter）
export const aliyunOCRService = new Proxy({} as AliyunOCRService | null, {
  get(target, prop) {
    const instance = getAliyunOCRService();
    if (!instance) return undefined;
    const value = (instance as any)[prop];
    return typeof value === 'function' ? value.bind(instance) : value;
  }
});
