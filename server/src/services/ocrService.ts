import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { aliyunOCRService, createAliyunOCRService } from './aliyunOCRService';

const execAsync = promisify(exec);

export type OCRProvider = 'ocrmypdf' | 'aliyun';

export interface OCROptions {
  /** 是否启用 OCR 预处理 */
  enabled: boolean;
  /** OCR 提供商 */
  provider?: OCRProvider;
  /** OCR 语言 (如: 'eng', 'chi_sim', 'eng+chi_sim') */
  language?: string;
  /** 是否去倾斜 */
  deskew?: boolean;
  /** 是否旋转页面 */
  rotatePages?: boolean;
  /** 是否清理图像 */
  clean?: boolean;
  /** 是否优化输出 */
  optimize?: boolean;
  /** 是否强制 OCR（即使已有文本层） */
  forceOcr?: boolean;
  /** 是否跳过已有文本的页面 */
  skipText?: boolean;
}

export class OCRService {
  private defaultOptions: OCROptions = {
    enabled: true,
    provider: 'aliyun', // 默认使用阿里云 OCR
    language: 'eng+chi_sim',
    deskew: true,
    rotatePages: true,
    clean: false,
    optimize: 1,
    forceOcr: false,
    skipText: true,
  };

  /**
   * 检查 OCRmyPDF 是否已安装
   */
  async checkOCRmyPDFInstalled(): Promise<boolean> {
    try {
      const { stdout } = await execAsync('ocrmypdf --version');
      console.log(`OCRmyPDF version: ${stdout.trim()}`);
      return true;
    } catch (error) {
      console.warn('OCRmyPDF is not installed or not in PATH');
      return false;
    }
  }

  /**
   * 对 PDF 进行 OCR 预处理
   * @param inputPath 输入 PDF 文件路径
   * @param outputPath 输出 PDF 文件路径（可选，默认覆盖原文件）
   * @param options OCR 选项
   * @returns 处理后的文件路径
   */
  async preprocessPDF(
    inputPath: string,
    outputPath?: string,
    options?: Partial<OCROptions>
  ): Promise<string> {
    const mergedOptions = { ...this.defaultOptions, ...options };

    // 如果未启用 OCR，直接返回原文件路径
    if (!mergedOptions.enabled) {
      console.log('OCR preprocessing is disabled');
      return inputPath;
    }

    // 根据提供商选择 OCR 方法
    const provider = mergedOptions.provider || 'aliyun';

    if (provider === 'aliyun') {
      return this.preprocessPDFWithAliyun(inputPath, outputPath);
    } else {
      return this.preprocessPDFWithOCRmyPDF(inputPath, outputPath, mergedOptions);
    }
  }

  /**
   * 使用阿里云 OCR 预处理 PDF
   */
  private async preprocessPDFWithAliyun(
    inputPath: string,
    outputPath?: string
  ): Promise<string> {
    if (!aliyunOCRService) {
      console.warn('Aliyun OCR service not configured, skipping OCR');
      return inputPath;
    }

    try {
      console.log(`Using Aliyun OCR for: ${path.basename(inputPath)}`);
      const result = await aliyunOCRService.recognizePDF(inputPath);

      if (!result.success) {
        console.warn(`Aliyun OCR failed: ${result.error}`);
        return inputPath;
      }

      // 将识别的文本保存到临时文件
      const textOutputPath = outputPath
        ? outputPath.replace('.pdf', '.txt')
        : this.getTempOutputPath(inputPath).replace('.pdf', '.txt');

      await fs.writeFile(textOutputPath, result.text, 'utf-8');
      console.log(`OCR text saved to: ${textOutputPath}`);

      // 注意：阿里云 OCR 只返回文本，不会生成带 OCR 层的 PDF
      // 如果需要生成 PDF，可以考虑将文本嵌入原 PDF
      return inputPath;
    } catch (error: any) {
      console.error('Aliyun OCR preprocessing failed:', error.message);
      return inputPath;
    }
  }

  /**
   * 使用 OCRmyPDF 预处理 PDF
   */
  private async preprocessPDFWithOCRmyPDF(
    inputPath: string,
    outputPath?: string,
    options?: OCROptions
  ): Promise<string> {
    // 检查 OCRmyPDF 是否安装
    const isInstalled = await this.checkOCRmyPDFInstalled();
    if (!isInstalled) {
      console.warn('OCRmyPDF not installed, skipping OCR preprocessing');
      return inputPath;
    }

    // 如果未指定输出路径，使用临时文件
    const finalOutputPath = outputPath || this.getTempOutputPath(inputPath);

    try {
      // 构建 OCRmyPDF 命令
      const command = this.buildOCRCommand(inputPath, finalOutputPath, options || this.defaultOptions);

      console.log(`Running OCR preprocessing: ${command}`);
      const startTime = Date.now();

      // 执行 OCR 处理（设置较长的超时时间，OCR 可能需要几分钟）
      const { stdout, stderr } = await execAsync(command, {
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
        timeout: 300000, // 5 minutes timeout
      });

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`OCR preprocessing completed in ${duration}s`);

      if (stderr) {
        console.log('OCR stderr:', stderr);
      }
      if (stdout) {
        console.log('OCR stdout:', stdout);
      }

      return finalOutputPath;
    } catch (error: any) {
      console.error('OCR preprocessing failed:', error.message);

      // 如果 OCR 失败，返回原文件路径
      // 清理可能生成的临时文件
      if (finalOutputPath !== inputPath) {
        try {
          await fs.unlink(finalOutputPath);
        } catch (unlinkError) {
          // 忽略删除失败
        }
      }

      // 返回原文件，不影响后续流程
      return inputPath;
    }
  }

  /**
   * 构建 OCRmyPDF 命令行
   */
  private buildOCRCommand(
    inputPath: string,
    outputPath: string,
    options: OCROptions
  ): string {
    const args: string[] = ['ocrmypdf'];

    // 语言设置
    if (options.language) {
      args.push('-l', options.language);
    }

    // 去倾斜
    if (options.deskew) {
      args.push('--deskew');
    }

    // 旋转页面
    if (options.rotatePages) {
      args.push('--rotate-pages');
    }

    // 清理图像
    if (options.clean) {
      args.push('--clean');
    }

    // 优化
    if (typeof options.optimize === 'number' && options.optimize > 0) {
      args.push('--optimize', options.optimize.toString());
    }

    // 强制 OCR
    if (options.forceOcr) {
      args.push('--force-ocr');
    }

    // 跳过已有文本的页面
    if (options.skipText) {
      args.push('--skip-text');
    }

    // 输出类型（PDF/A）
    args.push('--output-type', 'pdf');

    // 增加并发任务数（加速处理）
    args.push('--jobs', '4');

    // 输入和输出文件
    args.push(`"${inputPath}"`, `"${outputPath}"`);

    return args.join(' ');
  }

  /**
   * 生成临时输出文件路径
   */
  private getTempOutputPath(inputPath: string): string {
    const dir = path.dirname(inputPath);
    const basename = path.basename(inputPath, '.pdf');
    const timestamp = Date.now();
    return path.join(dir, `${basename}_ocr_${timestamp}.pdf`);
  }

  /**
   * 批量预处理 PDF 文件
   * @param inputPaths 输入文件路径数组
   * @param options OCR 选项
   * @returns 处理后的文件路径映射 { originalPath: processedPath }
   */
  async batchPreprocessPDFs(
    inputPaths: string[],
    options?: Partial<OCROptions>
  ): Promise<Map<string, string>> {
    const results = new Map<string, string>();

    for (const inputPath of inputPaths) {
      try {
        const outputPath = await this.preprocessPDF(inputPath, undefined, options);
        results.set(inputPath, outputPath);
      } catch (error) {
        console.error(`Failed to preprocess ${inputPath}:`, error);
        results.set(inputPath, inputPath); // 失败时使用原路径
      }
    }

    return results;
  }

  /**
   * 检查 PDF 是否已经包含文本层
   * @param pdfPath PDF 文件路径
   * @returns 是否包含文本
   */
  async hasTextLayer(pdfPath: string): Promise<boolean> {
    try {
      // 使用 pdftotext 或 pdfjs 快速检查
      // 这里简化实现，实际可以用更高效的方法
      const { stdout } = await execAsync(`pdftotext "${pdfPath}" - | head -c 100`);
      return stdout.trim().length > 0;
    } catch (error) {
      return false;
    }
  }
}

export const ocrService = new OCRService();
