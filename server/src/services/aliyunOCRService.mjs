// 使用 .mjs 扩展名确保 ESM 模式
import Ocr20210707Default from '@alicloud/ocr-api20210707';
import * as Ocr20210707All from '@alicloud/ocr-api20210707';
import OpenApiDefault from '@alicloud/openapi-client';
import * as OpenApiAll from '@alicloud/openapi-client';
import UtilDefault from '@alicloud/tea-util';
import * as UtilAll from '@alicloud/tea-util';
import { readFile, writeFile } from 'fs/promises';
import { basename, dirname, join } from 'path';

// 获取正确的导出 - SDK 的 Client 类在 default.default 中
const Ocr20210707 = Ocr20210707Default?.default || Ocr20210707Default;
const OpenApi = OpenApiDefault;
const Util = UtilDefault;

export class AliyunOCRService {
  constructor(config) {
    // 创建配置
    const apiConfig = new OpenApi.Config({
      accessKeyId: config.accessKeyId,
      accessKeySecret: config.accessKeySecret,
      endpoint: config.endpoint || 'ocr-api.cn-hangzhou.aliyuncs.com',
    });

    // 创建客户端
    this.client = new Ocr20210707(apiConfig);
  }

  /**
   * 识别 PDF 文件
   */
  async recognizePDF(pdfPath) {
    try {
      console.log(`Starting PDF OCR for: ${basename(pdfPath)}`);
      console.log('Note: PDF will be converted to images first');

      // 动态导入 PDF 转图片服务
      const { pdfToImageService } = await import('./pdfToImageService.js');

      // 转换 PDF 为图片
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
      const pages = [];
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
        } catch (error) {
          console.error(`Page ${pageImage.pageNumber} OCR error:`, error.message);
        }
      }

      // 清理临时图片
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
    } catch (error) {
      console.error('PDF OCR failed:', error.message);
      return {
        success: false,
        text: '',
        error: error.message,
      };
    }
  }

  /**
   * 识别图片文件
   */
  async recognizeImage(imagePath) {
    try {
      // 读取图片文件
      const fileBuffer = await readFile(imagePath);

      // 将 Buffer 转换为 Stream (SDK 需要 Stream)
      const { Readable } = await import('stream');
      const stream = Readable.from(fileBuffer);

      // 创建请求
      const RequestClass = Ocr20210707All.RecognizeGeneralRequest || Ocr20210707All.default.RecognizeGeneralRequest;
      const request = new RequestClass({
        body: stream,
      });

      console.log(`Calling Aliyun OCR API for image: ${basename(imagePath)}`);
      const startTime = Date.now();

      // 调用 API
      const RuntimeOptionsClass = Util.RuntimeOptions || UtilAll.RuntimeOptions || UtilAll.default.RuntimeOptions;
      const response = await this.client.recognizeGeneralWithOptions(
        request,
        new RuntimeOptionsClass({})
      );

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`Aliyun OCR completed in ${duration}s`);

      // 解析响应
      return this.parseResponse(response);
    } catch (error) {
      console.error('Aliyun OCR recognition failed:', error.message);
      console.error('Error details:', error);
      return {
        success: false,
        text: '',
        error: error.message,
      };
    }
  }

  /**
   * 识别图片 URL
   */
  async recognizeImageFromURL(imageUrl) {
    try {
      const RequestClass = Ocr20210707All.RecognizeGeneralRequest || Ocr20210707All.default.RecognizeGeneralRequest;
      const request = new RequestClass({
        url: imageUrl,
      });

      console.log(`Calling Aliyun OCR API for image URL: ${imageUrl}`);
      const startTime = Date.now();

      const RuntimeOptionsClass = Util.RuntimeOptions || UtilAll.RuntimeOptions || UtilAll.default.RuntimeOptions;
      const response = await this.client.recognizeGeneralWithOptions(
        request,
        new RuntimeOptionsClass({})
      );

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`Aliyun OCR completed in ${duration}s`);

      return this.parseResponse(response);
    } catch (error) {
      console.error('Aliyun OCR recognition failed:', error.message);
      return {
        success: false,
        text: '',
        error: error.message,
      };
    }
  }

  /**
   * 批量识别 PDF
   */
  async batchRecognizePDFs(pdfPaths) {
    const results = new Map();

    for (const pdfPath of pdfPaths) {
      try {
        const result = await this.recognizePDF(pdfPath);
        results.set(pdfPath, result);
      } catch (error) {
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
  parseResponse(response) {
    try {
      const body = response.body;

      if (!body) {
        return {
          success: false,
          text: '',
          error: 'Empty response body',
        };
      }

      // 检查状态码
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

      // 提取文本内容
      let fullText = '';

      // 尝试从不同的字段获取文本
      if (data.content) {
        fullText = data.content;
      } else if (data.prismWordsInfo && Array.isArray(data.prismWordsInfo)) {
        fullText = data.prismWordsInfo.map(item => item.word || '').join('\n');
      } else if (typeof data === 'string') {
        fullText = data;
      }

      return {
        success: true,
        text: fullText.trim(),
      };
    } catch (error) {
      console.error('Failed to parse OCR response:', error.message);
      return {
        success: false,
        text: '',
        error: `Parse error: ${error.message}`,
      };
    }
  }

  /**
   * 保存结果到文件
   */
  async saveResultToFile(result, outputPath) {
    if (!result.success) {
      throw new Error(`Cannot save failed OCR result: ${result.error}`);
    }

    await writeFile(outputPath, result.text, 'utf-8');
    console.log(`OCR result saved to: ${outputPath}`);
  }
}

/**
 * 创建阿里云 OCR 服务实例
 */
export function createAliyunOCRService(config) {
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

// 导出默认实例
export const aliyunOCRService = createAliyunOCRService();
