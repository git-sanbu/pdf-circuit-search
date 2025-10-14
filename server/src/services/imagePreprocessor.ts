import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

export interface ImageInfo {
  width: number;
  height: number;
  size: number;
}

export class ImagePreprocessor {
  // 阿里云 OCR 限制
  private readonly MIN_SIZE = 15;
  private readonly MAX_SIZE = 8192;
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  /**
   * 检查图片是否需要预处理
   */
  async needsPreprocessing(imagePath: string): Promise<boolean> {
    try {
      const metadata = await sharp(imagePath).metadata();
      const stats = await fs.stat(imagePath);

      const width = metadata.width || 0;
      const height = metadata.height || 0;
      const fileSize = stats.size;

      // 检查是否超出限制
      const exceedsSize = width > this.MAX_SIZE || height > this.MAX_SIZE || width < this.MIN_SIZE || height < this.MIN_SIZE;
      const exceedsFileSize = fileSize > this.MAX_FILE_SIZE;

      if (exceedsSize) {
        console.log(`[ImagePreprocessor] Image dimensions ${width}x${height} exceed limits (${this.MIN_SIZE}-${this.MAX_SIZE}px)`);
      }
      if (exceedsFileSize) {
        console.log(`[ImagePreprocessor] File size ${(fileSize / 1024 / 1024).toFixed(2)}MB exceeds 10MB limit`);
      }

      return exceedsSize || exceedsFileSize;
    } catch (error) {
      console.error('[ImagePreprocessor] Failed to check image:', error);
      return false;
    }
  }

  /**
   * 预处理图片 - 缩放到合适的尺寸
   */
  async preprocessImage(imagePath: string, outputPath?: string): Promise<string> {
    try {
      const metadata = await sharp(imagePath).metadata();
      const width = metadata.width || 0;
      const height = metadata.height || 0;

      console.log(`[ImagePreprocessor] Original size: ${width}x${height}`);

      // 计算缩放比例
      let scale = 1;
      if (width > this.MAX_SIZE || height > this.MAX_SIZE) {
        scale = this.MAX_SIZE / Math.max(width, height);
      }

      // 目标尺寸
      const targetWidth = Math.floor(width * scale);
      const targetHeight = Math.floor(height * scale);

      console.log(`[ImagePreprocessor] Target size: ${targetWidth}x${targetHeight} (scale: ${scale.toFixed(2)})`);

      // 输出路径
      const output = outputPath || imagePath.replace(/(\.\w+)$/, '_resized$1');

      // 缩放图片
      await sharp(imagePath)
        .resize(targetWidth, targetHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 90 }) // 转换为 JPEG 以减小文件大小
        .toFile(output);

      const outputStats = await fs.stat(output);
      console.log(`[ImagePreprocessor] Output size: ${(outputStats.size / 1024 / 1024).toFixed(2)}MB`);

      return output;
    } catch (error: any) {
      console.error('[ImagePreprocessor] Failed to preprocess image:', error.message);
      throw error;
    }
  }

  /**
   * 获取图片信息
   */
  async getImageInfo(imagePath: string): Promise<ImageInfo> {
    const metadata = await sharp(imagePath).metadata();
    const stats = await fs.stat(imagePath);

    return {
      width: metadata.width || 0,
      height: metadata.height || 0,
      size: stats.size,
    };
  }

  /**
   * 智能预处理 - 自动判断并处理
   */
  async smartPreprocess(imagePath: string): Promise<string> {
    const needsProcessing = await this.needsPreprocessing(imagePath);

    if (!needsProcessing) {
      console.log(`[ImagePreprocessor] Image is within limits, no preprocessing needed`);
      return imagePath;
    }

    console.log(`[ImagePreprocessor] Image needs preprocessing`);
    return await this.preprocessImage(imagePath);
  }
}

export const imagePreprocessor = new ImagePreprocessor();
