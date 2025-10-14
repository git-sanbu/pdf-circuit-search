import { dbService } from '../services/database.js';
import { pdfParser } from '../services/pdfParser.js';
import { smartOCRService } from '../services/smartOCRService.js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';

export async function initializePDFs() {
  const pdfDir = path.resolve(process.env.PDF_STORAGE_PATH || './pdfs');

  try {
    // Clean up database records for deleted files
    const allPDFs = dbService.getAllPDFs();
    for (const pdf of allPDFs) {
      try {
        await fs.access(pdf.filepath);
      } catch {
        console.log(`Removing deleted PDF from database: ${pdf.filename}`);
        dbService.deletePDF(pdf.id);
      }
    }

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

        // Check if it needs indexing
        if (!existing.indexed) {
          console.log(`  Indexing existing PDF: ${filename}...`);
          try {
            const segments = await pdfParser.parsePDF(existing.id, filepath);
            dbService.saveTextSegments(segments);
            dbService.updatePDFIndexStatus(existing.id, true);
            console.log(`  ✓ Indexed ${segments.length} text segments`);
          } catch (error) {
            console.error(`  ✗ Failed to index ${filename}:`, error);
          }
        }
        continue;
      }

      // 获取PDF信息
      const info = await pdfParser.getPDFInfo(filepath);

      // 保存到数据库
      const pdfId = uuidv4();
      const pdf = {
        id: pdfId,
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

      // Auto-index the PDF
      console.log(`  Indexing ${filename}...`);
      try {
        const segments = await pdfParser.parsePDF(pdfId, filepath);
        dbService.saveTextSegments(segments);
        dbService.updatePDFIndexStatus(pdfId, true);
        console.log(`  ✓ Indexed ${segments.length} text segments`);
      } catch (error) {
        console.error(`  ✗ Failed to index ${filename}:`, error);
      }
    }

    console.log('\n📝 PDF initialization complete!');

    // OCR 初始化
    if (process.env.ENABLE_OCR === 'true') {
      console.log('\n🔍 Initializing OCR processing...');
      try {
        const ocrStats = await smartOCRService.initializeAllPDFs();
        console.log(`\n✓ OCR initialization complete:`);
        console.log(`  - Total PDFs: ${ocrStats.total}`);
        console.log(`  - Newly processed: ${ocrStats.processed}`);
        console.log(`  - Using cache: ${ocrStats.cached}`);
        console.log(`  - Failed: ${ocrStats.failed}`);
      } catch (error) {
        console.error('✗ OCR initialization failed:', error);
      }
    } else {
      console.log('\n⚠️  OCR is disabled (set ENABLE_OCR=true to enable)');
    }

  } catch (error) {
    console.error('Failed to initialize system:', error);
  }
}
