# PDF电路图文档内搜索系统 - 开发步骤文档

> 基于系统架构文档，本文档提供详细的开发步骤指南，包括环境配置、代码实现、测试和部署的完整流程。

---

## 目录
- [开发阶段规划](#开发阶段规划)
- [第一阶段：基础功能开发 (MVP)](#第一阶段基础功能开发-mvp)
- [第二阶段：LLM增强功能](#第二阶段llm增强功能)
- [第三阶段：部署与优化](#第三阶段部署与优化)
- [开发规范与最佳实践](#开发规范与最佳实践)

---

## 开发阶段规划

### 时间线总览
```
第一阶段 (3-4天)    第二阶段 (2-3天)    第三阶段 (1-2天)
     MVP              LLM增强            部署优化
      ↓                  ↓                  ↓
   核心功能          AI功能            生产环境
```

### 里程碑
- **M1**: 完成PDF列表和详情页展示
- **M2**: 完成关键词搜索和高亮定位
- **M3**: 完成同义词扩展和文档问答
- **M4**: 完成Docker部署和上线

---

## 第一阶段：基础功能开发 (MVP)

> **目标**: 实现PDF展示、关键词搜索、相关度排序、智能定位和"下一处"导航功能
>
> **时间**: 3-4天

---

### 步骤 1.1: 项目初始化与环境搭建 (4小时)

#### 1.1.1 创建项目目录结构
```bash
# 创建根目录
mkdir pdf-circuit-search
cd pdf-circuit-search

# 创建子目录
mkdir -p client server server/pdfs server/data
```

#### 1.1.2 初始化前端项目
```bash
cd client

# 使用Vite创建React + TypeScript项目
npm create vite@latest . -- --template react-ts

# 安装核心依赖
npm install react-router-dom zustand axios @tanstack/react-query

# 安装PDF.js相关
npm install pdfjs-dist react-pdf

# 安装UI库
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# 安装shadcn/ui (按需)
npx shadcn-ui@latest init

# 安装图标库
npm install lucide-react

# 安装工具库
npm install clsx tailwind-merge
```

**配置文件**:

`client/tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

`client/vite.config.ts`:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/pdfs': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  }
})
```

#### 1.1.3 初始化后端项目
```bash
cd ../server

# 初始化Node.js项目
npm init -y

# 安装核心依赖
npm install express cors helmet dotenv

# 安装PDF处理库
npm install pdf-parse pdfjs-dist canvas

# 安装数据库
npm install better-sqlite3
# 或
npm install lowdb

# 安装TypeScript相关
npm install -D typescript @types/node @types/express @types/cors ts-node tsx nodemon

# 安装工具库
npm install uuid
npm install -D @types/uuid

# 初始化TypeScript配置
npx tsc --init
```

**配置文件**:

`server/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "rootDir": "./src",
    "outDir": "./dist",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

`server/package.json` (添加scripts):
```json
{
  "type": "module",
  "scripts": {
    "dev": "nodemon --exec tsx src/app.ts",
    "build": "tsc",
    "start": "node dist/app.js"
  }
}
```

`server/.env.example`:
```env
NODE_ENV=development
PORT=3000

# LLM配置 (第二阶段使用)
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini

# 路径配置
PDF_STORAGE_PATH=./pdfs
DATA_STORAGE_PATH=./data

# 功能开关
ENABLE_SYNONYM_SEARCH=false
ENABLE_QA=false
```

#### 1.1.4 手动下载PDF文件
```bash
# 从网盘链接下载4个PDF文件
# https://mega.nz/folder/OAVghZgC#IE2fw3wD9DoSLkPElhvcnQ

# 将文件放入 server/pdfs/ 目录
# 建议命名格式: doc1.pdf, doc2.pdf, doc3.pdf, doc4.pdf
```

---

### 步骤 1.2: 后端 - PDF管理模块 (6小时)

#### 1.2.1 创建数据模型
`server/src/models/PDFDocument.ts`:
```typescript
export interface PDFDocument {
  id: string;
  filename: string;
  title: string;
  filepath: string;
  filesize: number;
  pageCount: number;
  uploadedAt: Date;
  indexed: boolean;
  thumbnail?: string;
}

export interface TextSegment {
  id: string;
  pdfId: string;
  pageNumber: number;
  text: string;
  type: 'title' | 'table' | 'text';
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  fontSize?: number;
  fontName?: string;
}

export interface SearchIndex {
  pdfId: string;
  segments: TextSegment[];
  lastIndexed: Date;
}
```

#### 1.2.2 创建数据库服务
`server/src/services/database.ts`:
```typescript
import Database from 'better-sqlite3';
import path from 'path';
import { PDFDocument, SearchIndex, TextSegment } from '../models/PDFDocument.js';

const dbPath = path.join(process.cwd(), 'data', 'app.db');
const db = new Database(dbPath);

// 初始化数据库表
db.exec(`
  CREATE TABLE IF NOT EXISTS pdfs (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    title TEXT NOT NULL,
    filepath TEXT NOT NULL,
    filesize INTEGER NOT NULL,
    pageCount INTEGER NOT NULL,
    uploadedAt TEXT NOT NULL,
    indexed INTEGER DEFAULT 0,
    thumbnail TEXT
  );

  CREATE TABLE IF NOT EXISTS text_segments (
    id TEXT PRIMARY KEY,
    pdfId TEXT NOT NULL,
    pageNumber INTEGER NOT NULL,
    text TEXT NOT NULL,
    type TEXT NOT NULL,
    bbox TEXT NOT NULL,
    fontSize REAL,
    fontName TEXT,
    FOREIGN KEY (pdfId) REFERENCES pdfs(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_segments_pdfId ON text_segments(pdfId);
  CREATE INDEX IF NOT EXISTS idx_segments_text ON text_segments(text);
  CREATE INDEX IF NOT EXISTS idx_segments_type ON text_segments(type);
`);

export class DatabaseService {
  // PDF文档操作
  getAllPDFs(): PDFDocument[] {
    const rows = db.prepare('SELECT * FROM pdfs ORDER BY uploadedAt DESC').all();
    return rows.map(this.rowToPDF);
  }

  getPDFById(id: string): PDFDocument | null {
    const row = db.prepare('SELECT * FROM pdfs WHERE id = ?').get(id);
    return row ? this.rowToPDF(row as any) : null;
  }

  savePDF(pdf: PDFDocument): void {
    db.prepare(`
      INSERT OR REPLACE INTO pdfs
      (id, filename, title, filepath, filesize, pageCount, uploadedAt, indexed, thumbnail)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      pdf.id,
      pdf.filename,
      pdf.title,
      pdf.filepath,
      pdf.filesize,
      pdf.pageCount,
      pdf.uploadedAt.toISOString(),
      pdf.indexed ? 1 : 0,
      pdf.thumbnail || null
    );
  }

  updatePDFIndexStatus(id: string, indexed: boolean): void {
    db.prepare('UPDATE pdfs SET indexed = ? WHERE id = ?').run(indexed ? 1 : 0, id);
  }

  // 文本片段操作
  saveTextSegments(segments: TextSegment[]): void {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO text_segments
      (id, pdfId, pageNumber, text, type, bbox, fontSize, fontName)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insert = db.transaction((segs: TextSegment[]) => {
      for (const seg of segs) {
        stmt.run(
          seg.id,
          seg.pdfId,
          seg.pageNumber,
          seg.text,
          seg.type,
          JSON.stringify(seg.bbox),
          seg.fontSize || null,
          seg.fontName || null
        );
      }
    });

    insert(segments);
  }

  getTextSegmentsByPDF(pdfId: string): TextSegment[] {
    const rows = db.prepare('SELECT * FROM text_segments WHERE pdfId = ? ORDER BY pageNumber').all(pdfId);
    return rows.map(this.rowToSegment);
  }

  searchSegments(pdfId: string, keyword: string): TextSegment[] {
    const rows = db.prepare(`
      SELECT * FROM text_segments
      WHERE pdfId = ? AND text LIKE ?
      ORDER BY type, pageNumber
    `).all(pdfId, `%${keyword}%`);
    return rows.map(this.rowToSegment);
  }

  clearSegmentsByPDF(pdfId: string): void {
    db.prepare('DELETE FROM text_segments WHERE pdfId = ?').run(pdfId);
  }

  // 辅助方法
  private rowToPDF(row: any): PDFDocument {
    return {
      id: row.id,
      filename: row.filename,
      title: row.title,
      filepath: row.filepath,
      filesize: row.filesize,
      pageCount: row.pageCount,
      uploadedAt: new Date(row.uploadedAt),
      indexed: row.indexed === 1,
      thumbnail: row.thumbnail
    };
  }

  private rowToSegment(row: any): TextSegment {
    return {
      id: row.id,
      pdfId: row.pdfId,
      pageNumber: row.pageNumber,
      text: row.text,
      type: row.type as 'title' | 'table' | 'text',
      bbox: JSON.parse(row.bbox),
      fontSize: row.fontSize,
      fontName: row.fontName
    };
  }
}

export const dbService = new DatabaseService();
```

#### 1.2.3 创建PDF解析服务
`server/src/services/pdfParser.ts`:
```typescript
import fs from 'fs/promises';
import pdfParse from 'pdf-parse';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { TextSegment } from '../models/PDFDocument.js';
import { v4 as uuidv4 } from 'uuid';

// 配置PDF.js worker
const pdfjsWorker = await import('pdfjs-dist/legacy/build/pdf.worker.mjs');
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export class PDFParserService {
  /**
   * 解析PDF文件并提取文本片段
   */
  async parsePDF(pdfId: string, filepath: string): Promise<TextSegment[]> {
    const dataBuffer = await fs.readFile(filepath);

    // 使用pdfjs-dist进行详细解析
    const loadingTask = pdfjsLib.getDocument({ data: dataBuffer });
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

          // 推断文本类型
          const fontSize = Math.sqrt(
            transform[0] * transform[0] + transform[1] * transform[1]
          );
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

    // 表格判断: 包含制表符或特殊字符
    if (text.includes('\t') || /^\s*[-|+]+\s*$/.test(text) || /^\d+\.?\d*\s/.test(text)) {
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

  /**
   * 生成PDF缩略图 (第一页)
   */
  async generateThumbnail(filepath: string): Promise<string | null> {
    try {
      const dataBuffer = await fs.readFile(filepath);
      const loadingTask = pdfjsLib.getDocument({ data: dataBuffer });
      const pdfDoc = await loadingTask.promise;
      const page = await pdfDoc.getPage(1);

      const viewport = page.getViewport({ scale: 0.5 });
      const canvas = createCanvas(viewport.width, viewport.height);
      const context = canvas.getContext('2d');

      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;

      return canvas.toDataURL();
    } catch (error) {
      console.error('Failed to generate thumbnail:', error);
      return null;
    }
  }
}

// 简单的Canvas mock (如果不需要缩略图可以省略)
function createCanvas(width: number, height: number): any {
  // 这里需要canvas库支持，简化版本可以返回null
  return null;
}

export const pdfParser = new PDFParserService();
```

#### 1.2.4 创建PDF控制器
`server/src/controllers/pdfController.ts`:
```typescript
import { Request, Response } from 'express';
import { dbService } from '../services/database.js';
import { pdfParser } from '../services/pdfParser.js';
import path from 'path';
import fs from 'fs/promises';

export class PDFController {
  /**
   * GET /api/pdfs - 获取PDF列表
   */
  async listPDFs(req: Request, res: Response) {
    try {
      const pdfs = dbService.getAllPDFs();
      res.json({ success: true, data: pdfs });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch PDFs' });
    }
  }

  /**
   * GET /api/pdfs/:id - 获取PDF详情
   */
  async getPDF(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const pdf = dbService.getPDFById(id);

      if (!pdf) {
        return res.status(404).json({ success: false, error: 'PDF not found' });
      }

      res.json({ success: true, data: pdf });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch PDF' });
    }
  }

  /**
   * GET /api/pdfs/:id/file - 获取PDF文件流
   */
  async getPDFFile(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const pdf = dbService.getPDFById(id);

      if (!pdf) {
        return res.status(404).json({ success: false, error: 'PDF not found' });
      }

      const filepath = path.resolve(pdf.filepath);
      const stat = await fs.stat(filepath);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', stat.size);
      res.setHeader('Content-Disposition', `inline; filename="${pdf.filename}"`);

      const fileStream = (await import('fs')).createReadStream(filepath);
      fileStream.pipe(res);
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to serve PDF file' });
    }
  }

  /**
   * POST /api/pdfs/:id/index - 触发PDF索引
   */
  async indexPDF(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const pdf = dbService.getPDFById(id);

      if (!pdf) {
        return res.status(404).json({ success: false, error: 'PDF not found' });
      }

      if (pdf.indexed) {
        return res.json({ success: true, message: 'PDF already indexed' });
      }

      // 解析PDF并提取文本
      console.log(`Indexing PDF: ${pdf.filename}`);
      const segments = await pdfParser.parsePDF(id, pdf.filepath);

      // 保存到数据库
      dbService.saveTextSegments(segments);
      dbService.updatePDFIndexStatus(id, true);

      res.json({
        success: true,
        message: 'PDF indexed successfully',
        segmentCount: segments.length
      });
    } catch (error) {
      console.error('Index error:', error);
      res.status(500).json({ success: false, error: 'Failed to index PDF' });
    }
  }
}

export const pdfController = new PDFController();
```

#### 1.2.5 创建路由
`server/src/routes/pdfRoutes.ts`:
```typescript
import { Router } from 'express';
import { pdfController } from '../controllers/pdfController.js';

const router = Router();

router.get('/pdfs', pdfController.listPDFs.bind(pdfController));
router.get('/pdfs/:id', pdfController.getPDF.bind(pdfController));
router.get('/pdfs/:id/file', pdfController.getPDFFile.bind(pdfController));
router.post('/pdfs/:id/index', pdfController.indexPDF.bind(pdfController));

export default router;
```

#### 1.2.6 创建Express应用入口
`server/src/app.ts`:
```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import pdfRoutes from './routes/pdfRoutes.js';
import { initializePDFs } from './utils/initialize.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(express.json());

// 路由
app.use('/api', pdfRoutes);

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 启动服务器
app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);

  // 初始化PDF列表
  await initializePDFs();
});
```

#### 1.2.7 创建初始化脚本
`server/src/utils/initialize.ts`:
```typescript
import { dbService } from '../services/database.js';
import { pdfParser } from '../services/pdfParser.js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';

export async function initializePDFs() {
  const pdfDir = path.resolve(process.env.PDF_STORAGE_PATH || './pdfs');
  const files = await fs.readdir(pdfDir);
  const pdfFiles = files.filter(f => f.endsWith('.pdf'));

  console.log(`Found ${pdfFiles.length} PDF files`);

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
    console.log(`Added PDF: ${filename} (${info.pageCount} pages)`);
  }
}
```

---

### 步骤 1.3: 后端 - 搜索引擎模块 (8小时)

#### 1.3.1 创建搜索引擎服务
`server/src/services/searchEngine.ts`:
```typescript
import { dbService } from './database.js';
import { TextSegment } from '../models/PDFDocument.js';

export interface SearchRequest {
  pdfId: string;
  keyword: string;
  useSynonyms?: boolean;
}

export interface SearchResult {
  segment: TextSegment;
  relevance: number;
  highlightText: string;
}

export interface SearchResponse {
  keyword: string;
  expandedKeywords?: string[];
  results: SearchResult[];
  totalMatches: number;
}

export class SearchEngine {
  /**
   * 执行搜索
   */
  search(request: SearchRequest): SearchResponse {
    const { pdfId, keyword } = request;

    // 预处理关键词
    const processedKeyword = this.preprocessKeyword(keyword);

    // 搜索文本片段
    const segments = dbService.searchSegments(pdfId, processedKeyword);

    // 计算相关度并排序
    const results = segments
      .map(segment => ({
        segment,
        relevance: this.calculateRelevance(segment, processedKeyword),
        highlightText: this.highlightKeyword(segment.text, processedKeyword)
      }))
      .sort((a, b) => {
        // 先按相关度降序
        if (b.relevance !== a.relevance) {
          return b.relevance - a.relevance;
        }
        // 相关度相同则按页码升序
        return a.segment.pageNumber - b.segment.pageNumber;
      });

    return {
      keyword,
      results,
      totalMatches: results.length
    };
  }

  /**
   * 预处理关键词
   */
  private preprocessKeyword(keyword: string): string {
    return keyword.trim().toLowerCase();
  }

  /**
   * 计算相关度分数
   */
  private calculateRelevance(segment: TextSegment, keyword: string): number {
    // 基础权重
    const typeWeights = {
      title: 3.0,
      table: 2.0,
      text: 1.0
    };

    let score = typeWeights[segment.type];
    const segmentTextLower = segment.text.toLowerCase();
    const keywordLower = keyword.toLowerCase();

    // 完全匹配加成
    if (segmentTextLower === keywordLower) {
      score *= 2;
    }

    // 关键词出现频率
    const occurrences = this.countOccurrences(segmentTextLower, keywordLower);
    score *= (1 + occurrences * 0.2);

    // 关键词位置(越靠前越重要)
    const position = segmentTextLower.indexOf(keywordLower);
    if (position >= 0) {
      const positionFactor = 1 - (position / segment.text.length) * 0.3;
      score *= positionFactor;
    }

    // 字号加成(仅对标题)
    if (segment.type === 'title' && segment.fontSize) {
      const fontFactor = Math.min(segment.fontSize / 16, 1.5);
      score *= fontFactor;
    }

    return Math.round(score * 100) / 100;
  }

  /**
   * 计算关键词出现次数
   */
  private countOccurrences(text: string, keyword: string): number {
    const regex = new RegExp(keyword, 'gi');
    const matches = text.match(regex);
    return matches ? matches.length : 0;
  }

  /**
   * 高亮关键词
   */
  private highlightKeyword(text: string, keyword: string): string {
    const regex = new RegExp(`(${keyword})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }
}

export const searchEngine = new SearchEngine();
```

#### 1.3.2 创建搜索控制器
`server/src/controllers/searchController.ts`:
```typescript
import { Request, Response } from 'express';
import { searchEngine, SearchRequest } from '../services/searchEngine.js';
import { dbService } from '../services/database.js';

export class SearchController {
  /**
   * POST /api/search - 执行搜索
   */
  async search(req: Request, res: Response) {
    try {
      const { pdfId, keyword, useSynonyms } = req.body as SearchRequest;

      // 验证参数
      if (!pdfId || !keyword) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: pdfId, keyword'
        });
      }

      // 检查PDF是否存在
      const pdf = dbService.getPDFById(pdfId);
      if (!pdf) {
        return res.status(404).json({ success: false, error: 'PDF not found' });
      }

      // 检查是否已索引
      if (!pdf.indexed) {
        return res.status(400).json({
          success: false,
          error: 'PDF not indexed. Please index it first.'
        });
      }

      // 执行搜索
      const result = searchEngine.search({ pdfId, keyword, useSynonyms });

      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Search error:', error);
      res.status(500).json({ success: false, error: 'Search failed' });
    }
  }
}

export const searchController = new SearchController();
```

#### 1.3.3 创建搜索路由
`server/src/routes/searchRoutes.ts`:
```typescript
import { Router } from 'express';
import { searchController } from '../controllers/searchController.js';

const router = Router();

router.post('/search', searchController.search.bind(searchController));

export default router;
```

#### 1.3.4 更新app.ts
```typescript
// 在 server/src/app.ts 中添加
import searchRoutes from './routes/searchRoutes.js';

// ...
app.use('/api', searchRoutes);
```

---

### 步骤 1.4: 前端 - 类型定义与API服务 (2小时)

#### 1.4.1 创建类型定义
`client/src/types/index.ts`:
```typescript
export interface PDFDocument {
  id: string;
  filename: string;
  title: string;
  filepath: string;
  filesize: number;
  pageCount: number;
  uploadedAt: string;
  indexed: boolean;
  thumbnail?: string;
}

export interface TextSegment {
  id: string;
  pdfId: string;
  pageNumber: number;
  text: string;
  type: 'title' | 'table' | 'text';
  bbox: BBox;
  fontSize?: number;
  fontName?: string;
}

export interface BBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SearchResult {
  segment: TextSegment;
  relevance: number;
  highlightText: string;
}

export interface SearchResponse {
  keyword: string;
  expandedKeywords?: string[];
  results: SearchResult[];
  totalMatches: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

#### 1.4.2 创建API客户端
`client/src/services/api.ts`:
```typescript
import axios from 'axios';
import type { ApiResponse, PDFDocument, SearchResponse } from '@/types';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 响应拦截器
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API Error:', error);
    throw error;
  }
);

export const pdfApi = {
  // 获取PDF列表
  listPDFs: () => api.get<ApiResponse<PDFDocument[]>>('/pdfs'),

  // 获取PDF详情
  getPDF: (id: string) => api.get<ApiResponse<PDFDocument>>(`/pdfs/${id}`),

  // 获取PDF文件URL
  getPDFFileUrl: (id: string) => `/api/pdfs/${id}/file`,

  // 触发索引
  indexPDF: (id: string) => api.post<ApiResponse<void>>(`/pdfs/${id}/index`),
};

export const searchApi = {
  // 搜索
  search: (pdfId: string, keyword: string, useSynonyms = false) =>
    api.post<ApiResponse<SearchResponse>>('/search', {
      pdfId,
      keyword,
      useSynonyms,
    }),
};

export default api;
```

---

### 步骤 1.5: 前端 - PDF列表页 (4小时)

#### 1.5.1 创建PDF列表组件
`client/src/components/PDFList.tsx`:
```typescript
import { useQuery } from '@tanstack/react-query';
import { pdfApi } from '@/services/api';
import { useNavigate } from 'react-router-dom';
import { FileText, Loader2 } from 'lucide-react';
import type { PDFDocument } from '@/types';

export default function PDFList() {
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ['pdfs'],
    queryFn: async () => {
      const response = await pdfApi.listPDFs();
      return response.data || [];
    },
  });

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 p-4">
        加载失败，请重试
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
      {data?.map((pdf: PDFDocument) => (
        <div
          key={pdf.id}
          onClick={() => navigate(`/pdf/${pdf.id}`)}
          className="border rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer bg-white"
        >
          <div className="flex items-start gap-4">
            <FileText className="w-12 h-12 text-blue-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg mb-2 truncate">
                {pdf.title}
              </h3>
              <p className="text-sm text-gray-600 mb-1">
                {pdf.filename}
              </p>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>{pdf.pageCount} 页</span>
                <span>{formatFileSize(pdf.filesize)}</span>
              </div>
              {pdf.indexed && (
                <span className="inline-block mt-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                  已索引
                </span>
              )}
              {!pdf.indexed && (
                <span className="inline-block mt-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                  未索引
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

#### 1.5.2 创建首页
`client/src/pages/HomePage.tsx`:
```typescript
import PDFList from '@/components/PDFList';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">
            PDF电路图文档搜索系统
          </h1>
        </div>
      </header>
      <main className="max-w-7xl mx-auto">
        <PDFList />
      </main>
    </div>
  );
}
```

---

### 步骤 1.6: 前端 - PDF详情页与查看器 (10小时)

#### 1.6.1 配置PDF.js
`client/src/utils/pdfjs.ts`:
```typescript
import * as pdfjsLib from 'pdfjs-dist';

// 配置worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export { pdfjsLib };
```

#### 1.6.2 创建PDF查看器组件
`client/src/components/PDFViewer.tsx`:
```typescript
import { useEffect, useRef, useState } from 'react';
import { pdfjsLib } from '@/utils/pdfjs';
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react';
import type { SearchResult, BBox } from '@/types';

interface PDFViewerProps {
  pdfUrl: string;
  searchResults?: SearchResult[];
  currentMatchIndex?: number;
  onPageChange?: (page: number) => void;
}

export default function PDFViewer({
  pdfUrl,
  searchResults = [],
  currentMatchIndex = 0,
  onPageChange,
}: PDFViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [zoom, setZoom] = useState(1.0);
  const [rendering, setRendering] = useState(false);

  // 加载PDF文档
  useEffect(() => {
    const loadPDF = async () => {
      const loadingTask = pdfjsLib.getDocument(pdfUrl);
      const doc = await loadingTask.promise;
      setPdfDoc(doc);
      setTotalPages(doc.numPages);
    };

    loadPDF();
  }, [pdfUrl]);

  // 渲染当前页面
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    const renderPage = async () => {
      setRendering(true);
      const page = await pdfDoc.getPage(currentPage);
      const canvas = canvasRef.current!;
      const context = canvas.getContext('2d')!;

      const viewport = page.getViewport({ scale: zoom });
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;

      setRendering(false);

      // 绘制高亮
      drawHighlights(context, viewport, currentPage);
    };

    renderPage();
    onPageChange?.(currentPage);
  }, [pdfDoc, currentPage, zoom]);

  // 绘制高亮区域
  const drawHighlights = (context: CanvasRenderingContext2D, viewport: any, pageNum: number) => {
    const highlights = searchResults.filter(r => r.segment.pageNumber === pageNum);

    highlights.forEach((result, index) => {
      const { bbox, relevance } = result;
      const isActive = searchResults.indexOf(result) === currentMatchIndex;

      // 转换坐标
      const [x1, y1] = viewport.convertToViewportPoint(bbox.x, bbox.y);
      const [x2, y2] = viewport.convertToViewportPoint(
        bbox.x + bbox.width,
        bbox.y + bbox.height
      );

      // 绘制高亮矩形
      context.fillStyle = isActive
        ? 'rgba(255, 0, 0, 0.3)'
        : getHighlightColor(relevance);
      context.fillRect(x1, y1, x2 - x1, y2 - y1);

      // 绘制边框
      if (isActive) {
        context.strokeStyle = 'red';
        context.lineWidth = 2;
        context.strokeRect(x1, y1, x2 - x1, y2 - y1);
      }
    });
  };

  const getHighlightColor = (relevance: number): string => {
    if (relevance >= 6) return 'rgba(255, 0, 0, 0.2)';
    if (relevance >= 4) return 'rgba(255, 102, 0, 0.2)';
    if (relevance >= 2) return 'rgba(255, 204, 0, 0.2)';
    return 'rgba(255, 255, 0, 0.2)';
  };

  // 导航到搜索结果
  useEffect(() => {
    if (searchResults.length > 0 && currentMatchIndex >= 0) {
      const result = searchResults[currentMatchIndex];
      if (result.segment.pageNumber !== currentPage) {
        setCurrentPage(result.segment.pageNumber);
      }
    }
  }, [currentMatchIndex]);

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handleZoomIn = () => {
    setZoom(Math.min(zoom + 0.2, 3.0));
  };

  const handleZoomOut = () => {
    setZoom(Math.max(zoom - 0.2, 0.5));
  };

  return (
    <div className="flex flex-col h-full bg-gray-100">
      {/* 工具栏 */}
      <div className="bg-white border-b px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            className="p-2 hover:bg-gray-100 rounded disabled:opacity-50"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className="p-2 hover:bg-gray-100 rounded disabled:opacity-50"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomOut}
            disabled={zoom <= 0.5}
            className="p-2 hover:bg-gray-100 rounded disabled:opacity-50"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <span className="text-sm w-16 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            disabled={zoom >= 3.0}
            className="p-2 hover:bg-gray-100 rounded disabled:opacity-50"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* PDF画布 */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-4 flex justify-center"
      >
        <canvas
          ref={canvasRef}
          className="shadow-lg"
          style={{ maxWidth: '100%', height: 'fit-content' }}
        />
      </div>
    </div>
  );
}
```

#### 1.6.3 创建搜索面板组件
`client/src/components/SearchPanel.tsx`:
```typescript
import { useState } from 'react';
import { Search, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import type { SearchResponse } from '@/types';

interface SearchPanelProps {
  pdfId: string;
  onSearch: (keyword: string, useSynonyms: boolean) => void;
  searchResult?: SearchResponse;
  isSearching: boolean;
  currentMatchIndex: number;
  onNavigate: (direction: 'next' | 'prev') => void;
}

export default function SearchPanel({
  pdfId,
  onSearch,
  searchResult,
  isSearching,
  currentMatchIndex,
  onNavigate,
}: SearchPanelProps) {
  const [keyword, setKeyword] = useState('');
  const [useSynonyms, setUseSynonyms] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (keyword.trim()) {
      onSearch(keyword.trim(), useSynonyms);
    }
  };

  const totalResults = searchResult?.totalMatches || 0;
  const hasResults = totalResults > 0;

  return (
    <div className="bg-white border-l h-full flex flex-col w-80">
      {/* 搜索表单 */}
      <div className="p-4 border-b">
        <h2 className="font-semibold mb-4">搜索</h2>
        <form onSubmit={handleSearch} className="space-y-3">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="输入关键词，如：油门踏板"
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={useSynonyms}
              onChange={(e) => setUseSynonyms(e.target.checked)}
              className="rounded"
            />
            <span>使用同义词扩展</span>
          </label>

          <button
            type="submit"
            disabled={isSearching || !keyword.trim()}
            className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 disabled:bg-gray-300 flex items-center justify-center gap-2"
          >
            {isSearching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                搜索中...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                搜索
              </>
            )}
          </button>
        </form>
      </div>

      {/* 搜索结果 */}
      {hasResults && (
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">
                找到 {totalResults} 个结果
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onNavigate('prev')}
                  disabled={totalResults === 0}
                  className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
                  title="上一处"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <span className="text-xs px-2">
                  {currentMatchIndex + 1}/{totalResults}
                </span>
                <button
                  onClick={() => onNavigate('next')}
                  disabled={totalResults === 0}
                  className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
                  title="下一处"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* 结果列表 */}
          <div className="flex-1 overflow-y-auto">
            {searchResult?.results.map((result, index) => (
              <div
                key={result.segment.id}
                onClick={() => {
                  // 点击跳转到该结果
                  const diff = index - currentMatchIndex;
                  if (diff > 0) {
                    for (let i = 0; i < diff; i++) onNavigate('next');
                  } else if (diff < 0) {
                    for (let i = 0; i < Math.abs(diff); i++) onNavigate('prev');
                  }
                }}
                className={`p-3 border-b cursor-pointer hover:bg-gray-50 ${
                  index === currentMatchIndex ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-xs bg-gray-200 px-2 py-1 rounded">
                    P{result.segment.pageNumber}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-500 mb-1">
                      {result.segment.type === 'title' && '标题'}
                      {result.segment.type === 'table' && '表格'}
                      {result.segment.type === 'text' && '正文'}
                      {' · '}
                      相关度: {result.relevance}
                    </div>
                    <p className="text-sm line-clamp-3">{result.segment.text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!hasResults && searchResult && (
        <div className="p-4 text-center text-gray-500 text-sm">
          未找到相关结果
        </div>
      )}
    </div>
  );
}
```

#### 1.6.4 创建Zustand状态管理
`client/src/stores/searchStore.ts`:
```typescript
import { create } from 'zustand';
import type { SearchResponse } from '@/types';

interface SearchState {
  searchResult: SearchResponse | null;
  currentMatchIndex: number;
  isSearching: boolean;
  setSearchResult: (result: SearchResponse | null) => void;
  setCurrentMatchIndex: (index: number) => void;
  setIsSearching: (loading: boolean) => void;
  navigateNext: () => void;
  navigatePrev: () => void;
}

export const useSearchStore = create<SearchState>((set, get) => ({
  searchResult: null,
  currentMatchIndex: 0,
  isSearching: false,

  setSearchResult: (result) => set({ searchResult: result, currentMatchIndex: 0 }),
  setCurrentMatchIndex: (index) => set({ currentMatchIndex: index }),
  setIsSearching: (loading) => set({ isSearching: loading }),

  navigateNext: () => {
    const { searchResult, currentMatchIndex } = get();
    if (!searchResult) return;
    const nextIndex = (currentMatchIndex + 1) % searchResult.totalMatches;
    set({ currentMatchIndex: nextIndex });
  },

  navigatePrev: () => {
    const { searchResult, currentMatchIndex } = get();
    if (!searchResult) return;
    const prevIndex =
      currentMatchIndex === 0
        ? searchResult.totalMatches - 1
        : currentMatchIndex - 1;
    set({ currentMatchIndex: prevIndex });
  },
}));
```

#### 1.6.5 创建PDF详情页
`client/src/pages/PDFDetailPage.tsx`:
```typescript
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { pdfApi, searchApi } from '@/services/api';
import PDFViewer from '@/components/PDFViewer';
import SearchPanel from '@/components/SearchPanel';
import { useSearchStore } from '@/stores/searchStore';

export default function PDFDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    searchResult,
    currentMatchIndex,
    isSearching,
    setSearchResult,
    setIsSearching,
    navigateNext,
    navigatePrev,
  } = useSearchStore();

  // 获取PDF信息
  const { data: pdf, isLoading } = useQuery({
    queryKey: ['pdf', id],
    queryFn: async () => {
      const response = await pdfApi.getPDF(id!);
      return response.data;
    },
    enabled: !!id,
  });

  // 索引PDF
  const indexMutation = useMutation({
    mutationFn: () => pdfApi.indexPDF(id!),
    onSuccess: () => {
      window.location.reload();
    },
  });

  // 搜索
  const searchMutation = useMutation({
    mutationFn: ({ keyword, useSynonyms }: { keyword: string; useSynonyms: boolean }) =>
      searchApi.search(id!, keyword, useSynonyms),
    onMutate: () => {
      setIsSearching(true);
    },
    onSuccess: (response) => {
      setSearchResult(response.data || null);
      setIsSearching(false);
    },
    onError: () => {
      setIsSearching(false);
    },
  });

  const handleSearch = (keyword: string, useSynonyms: boolean) => {
    searchMutation.mutate({ keyword, useSynonyms });
  };

  const handleNavigate = (direction: 'next' | 'prev') => {
    if (direction === 'next') {
      navigateNext();
    } else {
      navigatePrev();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!pdf) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-red-500 mb-4">PDF未找到</p>
          <button
            onClick={() => navigate('/')}
            className="text-blue-500 hover:underline"
          >
            返回列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* 头部 */}
      <header className="bg-white border-b px-4 py-3 flex items-center gap-4">
        <button
          onClick={() => navigate('/')}
          className="p-2 hover:bg-gray-100 rounded"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="font-semibold">{pdf.title}</h1>
          <p className="text-sm text-gray-500">{pdf.filename}</p>
        </div>
        {!pdf.indexed && (
          <button
            onClick={() => indexMutation.mutate()}
            disabled={indexMutation.isPending}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
          >
            {indexMutation.isPending ? '索引中...' : '立即索引'}
          </button>
        )}
      </header>

      {/* 主体 */}
      {!pdf.indexed ? (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <p className="text-gray-600 mb-4">该PDF尚未索引，无法搜索</p>
            <button
              onClick={() => indexMutation.mutate()}
              disabled={indexMutation.isPending}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300"
            >
              {indexMutation.isPending ? '索引中...' : '开始索引'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1">
            <PDFViewer
              pdfUrl={pdfApi.getPDFFileUrl(id!)}
              searchResults={searchResult?.results}
              currentMatchIndex={currentMatchIndex}
            />
          </div>
          <SearchPanel
            pdfId={id!}
            onSearch={handleSearch}
            searchResult={searchResult || undefined}
            isSearching={isSearching}
            currentMatchIndex={currentMatchIndex}
            onNavigate={handleNavigate}
          />
        </div>
      )}
    </div>
  );
}
```

---

### 步骤 1.7: 前端 - 路由配置与入口 (1小时)

#### 1.7.1 配置路由
`client/src/App.tsx`:
```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import HomePage from './pages/HomePage';
import PDFDetailPage from './pages/PDFDetailPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/pdf/:id" element={<PDFDetailPage />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
```

#### 1.7.2 配置样式入口
`client/src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

mark {
  background-color: yellow;
  padding: 0 2px;
}

.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
```

#### 1.7.3 配置主入口
`client/src/main.tsx`:
```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

---

### 步骤 1.8: 测试与调试 (4小时)

#### 1.8.1 启动后端服务
```bash
cd server
cp .env.example .env
npm run dev
```

#### 1.8.2 启动前端服务
```bash
cd client
npm run dev
```

#### 1.8.3 测试清单
- [ ] PDF列表页加载正常
- [ ] 点击PDF进入详情页
- [ ] 索引功能正常工作
- [ ] 搜索功能返回结果
- [ ] 相关度排序正确
- [ ] 高亮显示正常
- [ ] "下一处"导航正常
- [ ] 缩放、翻页功能正常

---

## 第二阶段：LLM增强功能

> **目标**: 集成LLM实现同义词扩展和文档问答
>
> **时间**: 2-3天

---

### 步骤 2.1: 后端 - LLM服务集成 (4小时)

#### 2.1.1 安装LLM SDK
```bash
cd server

# 选择一个或两个
npm install openai
# 或
npm install @anthropic-ai/sdk
```

#### 2.1.2 创建LLM服务
`server/src/services/llmService.ts`:
```typescript
import OpenAI from 'openai';
// 或
// import Anthropic from '@anthropic-ai/sdk';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface SynonymRequest {
  keyword: string;
  language?: 'zh' | 'en' | 'both';
  domain?: 'automotive' | 'general';
}

export interface SynonymResponse {
  original: string;
  synonyms: string[];
  translations: {
    zh: string[];
    en: string[];
  };
}

export interface QARequest {
  pdfId: string;
  question: string;
  context: string;
}

export interface QAResponse {
  question: string;
  answer: string;
  confidence: number;
  sources: Array<{
    pageNumber: number;
    text: string;
  }>;
}

export class LLMService {
  /**
   * 获取关键词同义词
   */
  async getSynonyms(request: SynonymRequest): Promise<SynonymResponse> {
    const { keyword, language = 'both', domain = 'automotive' } = request;

    const prompt = `你是汽车电路图领域的专家。请为以下元器件名称提供所有可能的同义词、别名和翻译。

关键词: ${keyword}
领域: ${domain === 'automotive' ? '汽车电路' : '通用'}
语言: ${language}

请提供:
1. 中文同义词和别名
2. 英文名称及常用缩写
3. 行业术语

以JSON格式输出（不要包含markdown代码块标记）:
{
  "synonyms_zh": ["同义词1", "同义词2"],
  "synonyms_en": ["English Name", "Abbreviation"],
  "abbreviations": ["ABB1", "ABB2"]
}`;

    try {
      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0].message.content || '{}';
      const parsed = JSON.parse(content);

      const allSynonyms = [
        keyword,
        ...(parsed.synonyms_zh || []),
        ...(parsed.synonyms_en || []),
        ...(parsed.abbreviations || []),
      ];

      return {
        original: keyword,
        synonyms: [...new Set(allSynonyms)], // 去重
        translations: {
          zh: [keyword, ...(parsed.synonyms_zh || [])],
          en: parsed.synonyms_en || [],
        },
      };
    } catch (error) {
      console.error('LLM Synonym Error:', error);
      return {
        original: keyword,
        synonyms: [keyword],
        translations: { zh: [keyword], en: [] },
      };
    }
  }

  /**
   * 文档问答
   */
  async answerQuestion(request: QARequest): Promise<QAResponse> {
    const { question, context } = request;

    const prompt = `你是汽车电路图分析专家。根据以下电路图文档内容，准确回答用户问题。

文档内容:
${context}

用户问题: ${question}

要求:
1. 仅基于文档内容回答
2. 如果文档中没有相关信息，明确说明
3. 引用具体的页码
4. 对于连接性问题，给出具体的针脚号和连接路径

请用自然语言回答:`;

    try {
      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
      });

      const answer = response.choices[0].message.content || '无法回答该问题';

      return {
        question,
        answer,
        confidence: 0.85, // 简化版本，实际可以通过logprobs计算
        sources: [], // 由调用方提供
      };
    } catch (error) {
      console.error('LLM QA Error:', error);
      throw new Error('Failed to answer question');
    }
  }
}

export const llmService = new LLMService();
```

---

### 步骤 2.2: 后端 - LLM控制器与路由 (2小时)

#### 2.2.1 创建LLM控制器
`server/src/controllers/llmController.ts`:
```typescript
import { Request, Response } from 'express';
import { llmService } from '../services/llmService.js';
import { dbService } from '../services/database.js';

export class LLMController {
  /**
   * POST /api/llm/synonyms - 获取同义词
   */
  async getSynonyms(req: Request, res: Response) {
    try {
      const { keyword, language, domain } = req.body;

      if (!keyword) {
        return res.status(400).json({ success: false, error: 'Missing keyword' });
      }

      const result = await llmService.getSynonyms({ keyword, language, domain });
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Synonym error:', error);
      res.status(500).json({ success: false, error: 'Failed to get synonyms' });
    }
  }

  /**
   * POST /api/llm/qa - 文档问答
   */
  async answerQuestion(req: Request, res: Response) {
    try {
      const { pdfId, question } = req.body;

      if (!pdfId || !question) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: pdfId, question',
        });
      }

      // 从问题中提取关键词
      const keywords = this.extractKeywords(question);

      // 搜索相关段落
      let relevantSegments = [];
      for (const keyword of keywords) {
        const segments = dbService.searchSegments(pdfId, keyword);
        relevantSegments.push(...segments);
      }

      // 去重并限制数量
      relevantSegments = this.deduplicateAndLimit(relevantSegments, 10);

      // 构建上下文
      const context = relevantSegments
        .map((seg) => `[页码${seg.pageNumber}] ${seg.text}`)
        .join('\n\n');

      // 调用LLM
      const result = await llmService.answerQuestion({
        pdfId,
        question,
        context,
      });

      // 添加来源
      result.sources = relevantSegments.map((seg) => ({
        pageNumber: seg.pageNumber,
        text: seg.text.substring(0, 200),
      }));

      res.json({ success: true, data: result });
    } catch (error) {
      console.error('QA error:', error);
      res.status(500).json({ success: false, error: 'Failed to answer question' });
    }
  }

  /**
   * 从问题中提取关键词（简化版）
   */
  private extractKeywords(question: string): string[] {
    // 移除常见疑问词
    const stopWords = ['什么', '哪些', '如何', '怎么', '是', '的', '吗', '呢', '？'];
    let words = question.split(/\s+/);
    words = words.filter((w) => w.length > 1 && !stopWords.includes(w));
    return words.slice(0, 3); // 最多3个关键词
  }

  /**
   * 去重并限制数量
   */
  private deduplicateAndLimit(segments: any[], limit: number): any[] {
    const seen = new Set();
    const result = [];

    for (const seg of segments) {
      if (!seen.has(seg.id) && result.length < limit) {
        seen.add(seg.id);
        result.push(seg);
      }
    }

    return result;
  }
}

export const llmController = new LLMController();
```

#### 2.2.2 创建LLM路由
`server/src/routes/llmRoutes.ts`:
```typescript
import { Router } from 'express';
import { llmController } from '../controllers/llmController.js';

const router = Router();

router.post('/llm/synonyms', llmController.getSynonyms.bind(llmController));
router.post('/llm/qa', llmController.answerQuestion.bind(llmController));

export default router;
```

#### 2.2.3 更新app.ts
```typescript
// 在 server/src/app.ts 中添加
import llmRoutes from './routes/llmRoutes.js';

// ...
app.use('/api', llmRoutes);
```

#### 2.2.4 更新搜索控制器以支持同义词
`server/src/controllers/searchController.ts` (修改):
```typescript
// 在search方法中添加
import { llmService } from '../services/llmService.js';

// ...
if (useSynonyms) {
  const synonymResult = await llmService.getSynonyms({ keyword });

  // 使用所有同义词搜索
  const allResults: SearchResult[] = [];
  for (const syn of synonymResult.synonyms) {
    const synResults = searchEngine.search({ pdfId, keyword: syn });
    allResults.push(...synResults.results);
  }

  // 合并并去重
  const uniqueResults = this.deduplicateResults(allResults);

  result = {
    keyword,
    expandedKeywords: synonymResult.synonyms,
    results: uniqueResults,
    totalMatches: uniqueResults.length
  };
} else {
  result = searchEngine.search({ pdfId, keyword, useSynonyms });
}
```

---

### 步骤 2.3: 前端 - LLM功能集成 (4小时)

#### 2.3.1 更新API服务
`client/src/services/api.ts` (添加):
```typescript
export const llmApi = {
  // 获取同义词
  getSynonyms: (keyword: string, language = 'both', domain = 'automotive') =>
    api.post<ApiResponse<any>>('/llm/synonyms', { keyword, language, domain }),

  // 文档问答
  askQuestion: (pdfId: string, question: string) =>
    api.post<ApiResponse<any>>('/llm/qa', { pdfId, question }),
};
```

#### 2.3.2 创建问答组件
`client/src/components/LLMChat.tsx`:
```typescript
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Send, Loader2, MessageCircle } from 'lucide-react';
import { llmApi } from '@/services/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{ pageNumber: number; text: string }>;
}

interface LLMChatProps {
  pdfId: string;
}

export default function LLMChat({ pdfId }: LLMChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const askMutation = useMutation({
    mutationFn: (question: string) => llmApi.askQuestion(pdfId, question),
    onSuccess: (response, question) => {
      const data = response.data;
      setMessages((prev) => [
        ...prev,
        { role: 'user', content: question },
        {
          role: 'assistant',
          content: data.answer,
          sources: data.sources,
        },
      ]);
      setInput('');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      askMutation.mutate(input.trim());
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-blue-500 text-white p-4 rounded-full shadow-lg hover:bg-blue-600"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 bg-white rounded-lg shadow-2xl flex flex-col h-[500px]">
      {/* 头部 */}
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="font-semibold">文档问答</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 text-sm">
            <p>尝试问我：</p>
            <p className="mt-2">"油门踏板连接到ECU的哪些针脚？"</p>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                msg.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-300">
                  <p className="text-xs text-gray-600 mb-1">参考来源:</p>
                  {msg.sources.slice(0, 2).map((source, i) => (
                    <p key={i} className="text-xs text-gray-600">
                      • 页码 {source.pageNumber}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {askMutation.isPending && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-2">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          </div>
        )}
      </div>

      {/* 输入框 */}
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入问题..."
            className="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={askMutation.isPending}
          />
          <button
            type="submit"
            disabled={askMutation.isPending || !input.trim()}
            className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:bg-gray-300"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
```

#### 2.3.3 更新PDF详情页
`client/src/pages/PDFDetailPage.tsx` (添加):
```typescript
import LLMChat from '@/components/LLMChat';

// 在return的最后添加
{pdf.indexed && <LLMChat pdfId={id!} />}
```

---

### 步骤 2.4: 测试LLM功能 (2小时)

#### 2.4.1 配置API Key
```bash
cd server
# 编辑.env文件
OPENAI_API_KEY=sk-your-key-here
ENABLE_SYNONYM_SEARCH=true
ENABLE_QA=true
```

#### 2.4.2 测试清单
- [ ] 同义词搜索返回扩展关键词
- [ ] 搜索结果包含同义词匹配
- [ ] 问答窗口正常打开
- [ ] 问答返回准确答案
- [ ] 答案包含页码引用

---

## 第三阶段：部署与优化

> **目标**: Docker容器化部署，性能优化
>
> **时间**: 1-2天

---

### 步骤 3.1: Docker容器化 (4小时)

#### 3.1.1 创建前端Dockerfile
`Dockerfile.client`:
```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY client/package*.json ./
RUN npm ci

COPY client/ ./
RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

#### 3.1.2 创建后端Dockerfile
`Dockerfile.server`:
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY server/package*.json ./
RUN npm ci --only=production

COPY server/src ./src
COPY server/tsconfig.json ./

RUN npm run build

EXPOSE 3000

CMD ["node", "dist/app.js"]
```

#### 3.1.3 创建docker-compose.yml
`docker-compose.yml`:
```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./client/dist:/usr/share/nginx/html:ro
      - ./server/pdfs:/usr/share/nginx/pdfs:ro
    depends_on:
      - backend
    restart: unless-stopped

  backend:
    build:
      context: .
      dockerfile: Dockerfile.server
    environment:
      - NODE_ENV=production
      - PORT=3000
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - OPENAI_MODEL=${OPENAI_MODEL:-gpt-4o-mini}
      - PDF_STORAGE_PATH=/app/pdfs
      - DATA_STORAGE_PATH=/app/data
    volumes:
      - ./server/pdfs:/app/pdfs
      - ./server/data:/app/data
    ports:
      - "3000:3000"
    restart: unless-stopped
```

#### 3.1.4 创建nginx.conf
`nginx.conf`:
```nginx
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    sendfile on;
    keepalive_timeout 65;
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    server {
        listen 80;
        server_name localhost;

        # 前端静态资源
        location / {
            root /usr/share/nginx/html;
            try_files $uri $uri/ /index.html;
        }

        # PDF文件服务
        location /pdfs/ {
            alias /usr/share/nginx/pdfs/;
            add_header Cache-Control "public, max-age=3600";
        }

        # API代理
        location /api/ {
            proxy_pass http://backend:3000/api/;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_cache_bypass $http_upgrade;
            proxy_read_timeout 60s;
        }
    }
}
```

#### 3.1.5 创建.dockerignore
`.dockerignore`:
```
node_modules
npm-debug.log
.git
.gitignore
.env
dist
*.md
.vscode
```

---

### 步骤 3.2: 部署脚本 (2小时)

#### 3.2.1 创建部署脚本
`deploy.sh`:
```bash
#!/bin/bash

echo "🚀 开始部署 PDF电路图搜索系统..."

# 1. 构建前端
echo "📦 构建前端..."
cd client
npm install
npm run build
cd ..

# 2. 启动Docker服务
echo "🐳 启动Docker服务..."
docker-compose down
docker-compose up -d --build

# 3. 等待服务启动
echo "⏳ 等待服务启动..."
sleep 10

# 4. 健康检查
echo "🏥 健康检查..."
curl -f http://localhost/health || exit 1

echo "✅ 部署完成！"
echo "🌐 访问地址: http://localhost"
```

#### 3.2.2 创建README.md
`README.md`:
```markdown
# PDF电路图文档内搜索系统

## 快速开始

### 开发模式

1. 安装依赖
\`\`\`bash
# 前端
cd client && npm install

# 后端
cd server && npm install
\`\`\`

2. 配置环境变量
\`\`\`bash
cd server
cp .env.example .env
# 编辑.env，配置OPENAI_API_KEY
\`\`\`

3. 启动服务
\`\`\`bash
# 终端1: 启动后端
cd server && npm run dev

# 终端2: 启动前端
cd client && npm run dev
\`\`\`

4. 访问 http://localhost:5173

### 生产部署

1. 配置环境变量
\`\`\`bash
cp .env.example .env
# 编辑.env，配置OPENAI_API_KEY
\`\`\`

2. 执行部署
\`\`\`bash
chmod +x deploy.sh
./deploy.sh
\`\`\`

3. 访问 http://localhost

## 功能特性

- ✅ PDF文件列表展示
- ✅ PDF在线阅读（缩放、翻页）
- ✅ 关键词搜索
- ✅ 智能相关度排序
- ✅ 高亮显示与定位
- ✅ "下一处"导航
- ✅ 同义词扩展（LLM）
- ✅ 文档问答（LLM）

## 技术栈

- **前端**: React + TypeScript + Vite + Tailwind CSS + PDF.js
- **后端**: Node.js + Express + TypeScript + SQLite
- **LLM**: OpenAI GPT-4o-mini
- **部署**: Docker + Nginx

## 许可证

MIT
\`\`\`

---

### 步骤 3.3: 性能优化 (2小时)

#### 3.3.1 后端优化检查清单
- [ ] 启用SQLite索引
- [ ] 实现LLM结果缓存
- [ ] 添加请求限流
- [ ] 优化PDF解析性能

#### 3.3.2 前端优化检查清单
- [ ] 代码分割（React.lazy）
- [ ] PDF分页加载
- [ ] 图片懒加载
- [ ] React Query缓存配置

---

## 开发规范与最佳实践

### 代码规范
- 使用TypeScript严格模式
- 遵循ESLint规则
- 组件使用函数式+Hooks
- API统一错误处理

### Git提交规范
```
feat: 新功能
fix: 修复bug
docs: 文档更新
style: 代码格式
refactor: 重构
test: 测试
chore: 构建/工具
```

### 测试策略
- 单元测试：核心算法（相关度计算）
- 集成测试：API接口
- E2E测试：关键用户流程

---

## 总结

本开发步骤文档覆盖了从环境搭建到生产部署的完整流程，按照三个阶段循序渐进：

**第一阶段（MVP）**: 实现核心的PDF展示和搜索功能
**第二阶段（LLM）**: 集成AI能力，提升搜索和问答体验
**第三阶段（部署）**: 容器化部署，优化性能

严格按照步骤执行，预计6-9天可完成全部开发和部署工作。
```

