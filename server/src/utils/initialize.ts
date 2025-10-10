import { dbService } from '../services/database.js';
import { pdfParser } from '../services/pdfParser.js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';

export async function initializePDFs() {
  const pdfDir = path.resolve(process.env.PDF_STORAGE_PATH || './pdfs');

  try {
    const files = await fs.readdir(pdfDir);
    const pdfFiles = files.filter(f => f.toLowerCase().endsWith('.pdf'));

    console.log(`Found ${pdfFiles.length} PDF files in ${pdfDir}`);

    for (const filename of pdfFiles) {
      const filepath = path.join(pdfDir, filename);
      const stat = await fs.stat(filepath);

      // 检查是否已存在
      const existing = dbService.getAllPDFs().find(p => p.filename === filename);
      if (existing) {
        console.log(`Skipping existing PDF: ${filename}`);
        continue;
      }

      // 获取PDF信息
      const info = await pdfParser.getPDFInfo(filepath);

      // 保存到数据库
      const pdf = {
        id: uuidv4(),
        filename,
        title: filename.replace('.pdf', ''),
        filepath,
        filesize: stat.size,
        pageCount: info.pageCount,
        uploadedAt: new Date(),
        indexed: false
      };

      dbService.savePDF(pdf);
      console.log(`✓ Added PDF: ${filename} (${info.pageCount} pages)`);
    }

    console.log('PDF initialization complete!');
  } catch (error) {
    console.error('Failed to initialize PDFs:', error);
  }
}
