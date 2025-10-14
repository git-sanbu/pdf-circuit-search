import crypto from 'crypto';
import fs from 'fs/promises';
import { createReadStream } from 'fs';

export interface FileInfo {
  hash: string;
  size: number;
  lastModified: Date;
}

export class FileHashService {
  /**
   * 计算文件的 SHA256 哈希值
   * @param filePath 文件路径
   * @returns 哈希值
   */
  async calculateFileHash(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = createReadStream(filePath);

      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  /**
   * 获取文件完整信息（哈希、大小、修改时间）
   * @param filePath 文件路径
   * @returns 文件信息
   */
  async getFileInfo(filePath: string): Promise<FileInfo> {
    const [hash, stats] = await Promise.all([
      this.calculateFileHash(filePath),
      fs.stat(filePath),
    ]);

    return {
      hash,
      size: stats.size,
      lastModified: stats.mtime,
    };
  }

  /**
   * 比较两个文件是否相同
   * @param hash1 文件1的哈希
   * @param hash2 文件2的哈希
   * @returns 是否相同
   */
  compareHashes(hash1: string, hash2: string): boolean {
    return hash1 === hash2;
  }

  /**
   * 检查文件是否已更改
   * @param filePath 文件路径
   * @param previousHash 之前的哈希值
   * @returns 是否已更改
   */
  async hasFileChanged(filePath: string, previousHash: string): Promise<boolean> {
    try {
      const currentHash = await this.calculateFileHash(filePath);
      return !this.compareHashes(currentHash, previousHash);
    } catch (error) {
      // 文件不存在或无法访问，视为已更改
      return true;
    }
  }

  /**
   * 批量计算文件哈希
   * @param filePaths 文件路径数组
   * @returns 文件路径到哈希值的映射
   */
  async batchCalculateHashes(filePaths: string[]): Promise<Map<string, string>> {
    const results = new Map<string, string>();

    await Promise.all(
      filePaths.map(async (filePath) => {
        try {
          const hash = await this.calculateFileHash(filePath);
          results.set(filePath, hash);
        } catch (error) {
          console.error(`Failed to calculate hash for ${filePath}:`, error);
        }
      })
    );

    return results;
  }
}

export const fileHashService = new FileHashService();
