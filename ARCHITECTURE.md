# PDF电路图文档内搜索系统 - 系统架构文档

## 1. 项目概述

### 1.1 项目目标
构建一个智能PDF电路图搜索系统，支持电路图文档的在线展示、关键词智能搜索、相关度排序定位、同义词扩展和文档问答功能。

### 1.2 核心功能
- **PDF文件管理**: 4个PDF文件的列表展示与详情查看
- **PDF阅读器**: 支持缩放、平移、翻页等基础操作
- **智能搜索**: 关键词搜索 + 相关度排序 + 智能定位
- **LLM增强**: 同义词扩展 + 电路图连接性问答

---

## 2. 技术栈选型

### 2.1 前端技术栈
```
┌─────────────────────────────────────────┐
│ React 18 + TypeScript                    │  核心框架
├─────────────────────────────────────────┤
│ Vite 5                                   │  构建工具
│ React Router 6                           │  路由管理
│ Zustand                                  │  状态管理
├─────────────────────────────────────────┤
│ PDF.js (Mozilla)                         │  PDF渲染引擎
│ react-pdf / pdfjs-dist                   │  React集成
├─────────────────────────────────────────┤
│ Tailwind CSS 3                           │  样式框架
│ shadcn/ui                                │  UI组件库
│ Lucide React                             │  图标库
├─────────────────────────────────────────┤
│ Axios                                    │  HTTP客户端
│ React Query (TanStack Query)            │  数据获取与缓存
└─────────────────────────────────────────┘
```

### 2.2 后端技术栈
```
┌─────────────────────────────────────────┐
│ Node.js 20 + TypeScript                  │  运行环境
├─────────────────────────────────────────┤
│ Express 4                                │  Web框架
│ CORS                                     │  跨域支持
│ Helmet                                   │  安全增强
├─────────────────────────────────────────┤
│ pdf-parse                                │  PDF文本提取
│ pdfjs-dist                               │  PDF结构解析
├─────────────────────────────────────────┤
│ OpenAI SDK / Anthropic SDK              │  LLM集成
│ LangChain (可选)                         │  LLM编排
├─────────────────────────────────────────┤
│ Better-SQLite3 / LowDB                   │  本地数据库
└─────────────────────────────────────────┘
```

### 2.3 部署技术栈
```
┌─────────────────────────────────────────┐
│ Docker + Docker Compose                  │  容器化
│ Nginx                                    │  反向代理 + 静态服务
│ PM2 (可选)                               │  Node进程管理
└─────────────────────────────────────────┘
```

---

## 3. 系统架构设计

### 3.1 整体架构图

```
┌────────────────────────────────────────────────────────────────┐
│                          用户浏览器                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │  PDF列表页   │  │  PDF详情页   │  │  搜索界面    │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
└────────────────────────────────────────────────────────────────┘
                              ↓ HTTP/REST API
┌────────────────────────────────────────────────────────────────┐
│                        Nginx 反向代理                            │
│              (静态资源缓存 + API路由转发)                        │
└────────────────────────────────────────────────────────────────┘
                              ↓
        ┌──────────────────────────────────────────┐
        │                                          │
        ↓                                          ↓
┌──────────────────┐                    ┌──────────────────┐
│   前端静态资源    │                    │   后端API服务    │
│  (React SPA)     │                    │  (Express)       │
└──────────────────┘                    └──────────────────┘
                                                 ↓
                        ┌────────────────────────┼────────────────────────┐
                        ↓                        ↓                        ↓
              ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
              │  PDF管理模块      │    │  搜索引擎模块    │    │  LLM服务模块     │
              │  - 文件上传       │    │  - 文本索引      │    │  - 同义词扩展    │
              │  - 文件列表       │    │  - 相关度计算    │    │  - 文档问答      │
              │  - 文件服务       │    │  - 位置定位      │    │  - Prompt工程    │
              └──────────────────┘    └──────────────────┘    └──────────────────┘
                        ↓                        ↓                        ↓
              ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
              │  文件存储         │    │  索引缓存         │    │  OpenAI/Claude   │
              │  /pdfs/           │    │  SQLite/JSON     │    │  API             │
              └──────────────────┘    └──────────────────┘    └──────────────────┘
```

### 3.2 目录结构

```
pdf-circuit-search/
├── client/                          # 前端应用
│   ├── src/
│   │   ├── components/              # React组件
│   │   │   ├── PDFList.tsx         # PDF列表组件
│   │   │   ├── PDFViewer.tsx       # PDF查看器组件
│   │   │   ├── SearchPanel.tsx     # 搜索面板
│   │   │   ├── SearchResults.tsx   # 搜索结果列表
│   │   │   ├── LLMChat.tsx         # LLM问答界面
│   │   │   └── ui/                 # shadcn/ui组件
│   │   ├── pages/
│   │   │   ├── HomePage.tsx        # 首页/列表页
│   │   │   └── PDFDetailPage.tsx   # PDF详情页
│   │   ├── services/
│   │   │   ├── api.ts              # API客户端
│   │   │   └── pdfService.ts       # PDF相关API
│   │   ├── stores/
│   │   │   └── searchStore.ts      # 搜索状态管理
│   │   ├── types/
│   │   │   └── index.ts            # TypeScript类型定义
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
├── server/                          # 后端服务
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── pdfController.ts    # PDF相关接口
│   │   │   ├── searchController.ts # 搜索接口
│   │   │   └── llmController.ts    # LLM接口
│   │   ├── services/
│   │   │   ├── pdfParser.ts        # PDF解析服务
│   │   │   ├── searchEngine.ts     # 搜索引擎
│   │   │   ├── relevanceRanker.ts  # 相关度排序
│   │   │   └── llmService.ts       # LLM服务封装
│   │   ├── models/
│   │   │   ├── PDFDocument.ts      # PDF文档模型
│   │   │   └── SearchIndex.ts      # 搜索索引模型
│   │   ├── routes/
│   │   │   ├── pdfRoutes.ts
│   │   │   ├── searchRoutes.ts
│   │   │   └── llmRoutes.ts
│   │   ├── utils/
│   │   │   ├── textExtractor.ts    # 文本提取工具
│   │   │   └── logger.ts           # 日志工具
│   │   ├── config/
│   │   │   └── index.ts            # 配置管理
│   │   └── app.ts                  # Express应用入口
│   ├── pdfs/                        # PDF文件存储目录
│   ├── data/                        # 数据库/缓存目录
│   ├── package.json
│   └── tsconfig.json
│
├── docker-compose.yml               # Docker编排
├── Dockerfile.client                # 前端Docker镜像
├── Dockerfile.server                # 后端Docker镜像
├── nginx.conf                       # Nginx配置
├── .env.example                     # 环境变量示例
└── README.md                        # 项目说明
```

---

## 4. 核心模块设计

### 4.1 PDF管理模块

#### 4.1.1 数据模型
```typescript
interface PDFDocument {
  id: string;                    // 文档唯一标识
  filename: string;              // 文件名
  title: string;                 // 文档标题
  filepath: string;              // 文件路径
  filesize: number;              // 文件大小(bytes)
  pageCount: number;             // 页数
  uploadedAt: Date;              // 上传时间
  indexed: boolean;              // 是否已索引
  thumbnail?: string;            // 缩略图(base64)
}
```

#### 4.1.2 API接口
```
GET  /api/pdfs              # 获取PDF列表
GET  /api/pdfs/:id          # 获取PDF详情
GET  /api/pdfs/:id/file     # 获取PDF文件(二进制流)
POST /api/pdfs/upload       # 上传PDF文件(可选)
POST /api/pdfs/:id/index    # 触发PDF索引
```

### 4.2 PDF解析与索引模块

#### 4.2.1 文本提取流程
```
PDF文件 → pdf-parse → 提取文本内容
                    ↓
          ┌─────────┴─────────┐
          │  按页面提取文本    │
          │  保留位置信息      │
          └─────────┬─────────┘
                    ↓
          ┌─────────────────────┐
          │  内容分类识别        │
          │  - 标题(字号>18px)   │
          │  - 表格(规则排列)    │
          │  - 普通文本          │
          └─────────┬─────────┘
                    ↓
          ┌─────────────────────┐
          │  构建搜索索引        │
          │  存储到数据库        │
          └─────────────────────┘
```

#### 4.2.2 索引数据结构
```typescript
interface TextSegment {
  id: string;
  pdfId: string;                 // 所属PDF文档ID
  pageNumber: number;            // 页码
  text: string;                  // 文本内容
  type: 'title' | 'table' | 'text'; // 内容类型
  bbox: {                        // 边界框(用于定位)
    x: number;
    y: number;
    width: number;
    height: number;
  };
  fontSize?: number;             // 字号
  fontName?: string;             // 字体
  metadata?: Record<string, any>; // 其他元数据
}

interface SearchIndex {
  pdfId: string;
  segments: TextSegment[];
  lastIndexed: Date;
}
```

### 4.3 搜索引擎模块

#### 4.3.1 搜索流程
```
用户输入关键词
      ↓
┌─────────────────┐
│ 1. 预处理        │
│ - 去空格         │
│ - 转小写         │
│ - 分词(中英文)   │
└────────┬────────┘
         ↓
┌─────────────────┐
│ 2. 基础搜索      │
│ - 全文匹配       │
│ - 模糊匹配(可选) │
└────────┬────────┘
         ↓
┌─────────────────┐
│ 3. 相关度计算    │
│ - 标题: 权重3    │
│ - 表格: 权重2    │
│ - 文本: 权重1    │
└────────┬────────┘
         ↓
┌─────────────────┐
│ 4. 结果排序      │
│ - 按相关度降序   │
│ - 按页码升序     │
└────────┬────────┘
         ↓
   返回搜索结果
```

#### 4.3.2 相关度计算算法
```typescript
function calculateRelevance(segment: TextSegment, keyword: string): number {
  // 基础权重
  const typeWeights = {
    title: 3.0,
    table: 2.0,
    text: 1.0
  };

  let score = typeWeights[segment.type];

  // 完全匹配加成
  if (segment.text.toLowerCase() === keyword.toLowerCase()) {
    score *= 2;
  }

  // 关键词出现频率
  const occurrences = countOccurrences(segment.text, keyword);
  score *= (1 + occurrences * 0.2);

  // 关键词位置(越靠前越重要)
  const position = segment.text.toLowerCase().indexOf(keyword.toLowerCase());
  const positionFactor = 1 - (position / segment.text.length) * 0.3;
  score *= positionFactor;

  return score;
}
```

#### 4.3.3 搜索API
```typescript
// 搜索请求
interface SearchRequest {
  pdfId: string;         // PDF文档ID
  keyword: string;       // 搜索关键词
  useSynonyms?: boolean; // 是否使用同义词扩展
}

// 搜索结果
interface SearchResult {
  segment: TextSegment;
  relevance: number;     // 相关度分数
  highlightText: string; // 高亮后的文本
}

// 搜索响应
interface SearchResponse {
  keyword: string;
  expandedKeywords?: string[]; // 扩展的同义词
  results: SearchResult[];
  totalMatches: number;
}

// API
POST /api/search
{
  "pdfId": "abc123",
  "keyword": "油门踏板",
  "useSynonyms": true
}
```

### 4.4 PDF查看器模块

#### 4.4.1 核心功能
```typescript
interface PDFViewerProps {
  pdfUrl: string;              // PDF文件URL
  initialPage?: number;        // 初始页码
  initialZoom?: number;        // 初始缩放比例
  searchResults?: SearchResult[]; // 搜索结果
  currentMatchIndex?: number;  // 当前匹配项索引
  onPageChange?: (page: number) => void;
}

interface PDFViewerState {
  currentPage: number;         // 当前页码
  totalPages: number;          // 总页数
  zoom: number;                // 缩放比例 (0.5 - 3.0)
  rotation: number;            // 旋转角度 (0, 90, 180, 270)
  highlights: HighlightArea[]; // 高亮区域
}

// 操作方法
interface PDFViewerMethods {
  nextPage(): void;
  prevPage(): void;
  goToPage(page: number): void;
  zoomIn(): void;
  zoomOut(): void;
  setZoom(zoom: number): void;
  rotate(angle: number): void;
  highlightText(pageNum: number, bbox: BBox): void;
  scrollToHighlight(index: number): void;
}
```

#### 4.4.2 搜索结果高亮
```typescript
// 高亮区域
interface HighlightArea {
  pageNumber: number;
  bbox: BBox;
  relevance: number;
  color: string; // 根据相关度着色
}

// 高亮颜色映射
function getHighlightColor(relevance: number): string {
  if (relevance >= 6) return '#ff0000'; // 红色 - 最相关(标题+完全匹配)
  if (relevance >= 4) return '#ff6600'; // 橙色 - 高相关(标题)
  if (relevance >= 2) return '#ffcc00'; // 黄色 - 中相关(表格)
  return '#ffff00';                      // 淡黄 - 低相关(文本)
}
```

#### 4.4.3 "下一处"导航
```typescript
interface NavigationState {
  currentIndex: number;
  totalResults: number;
}

function navigateToNextMatch(state: NavigationState, results: SearchResult[]) {
  const nextIndex = (state.currentIndex + 1) % state.totalResults;
  const nextResult = results[nextIndex];

  // 跳转到对应页面
  pdfViewer.goToPage(nextResult.segment.pageNumber);

  // 滚动到高亮位置
  pdfViewer.scrollToHighlight(nextIndex);

  return { ...state, currentIndex: nextIndex };
}
```

### 4.5 LLM集成模块

#### 4.5.1 同义词扩展服务
```typescript
interface SynonymRequest {
  keyword: string;
  language: 'zh' | 'en' | 'both'; // 语言
  domain: 'automotive' | 'general'; // 领域
}

interface SynonymResponse {
  original: string;
  synonyms: string[];
  translations: {
    zh: string[];
    en: string[];
  };
}

// Prompt模板
const SYNONYM_PROMPT = `
你是汽车电路图领域的专家。请为以下元器件名称提供所有可能的同义词、别名和翻译。

关键词: {keyword}

请提供:
1. 中文同义词
2. 英文名称及缩写
3. 行业常用别名

以JSON格式输出:
{
  "synonyms_zh": ["同义词1", "同义词2"],
  "synonyms_en": ["English Name", "EN"],
  "abbreviations": ["ABB", "ABR"]
}
`;

// API
POST /api/llm/synonyms
{
  "keyword": "油门踏板",
  "language": "both",
  "domain": "automotive"
}

// Response
{
  "original": "油门踏板",
  "synonyms": [
    "油门踏板",
    "踏板位置传感器",
    "加速踏板",
    "Accelerator Pedal",
    "Accelerator Pedal Sensor",
    "APS",
    "APP"
  ],
  "translations": {
    "zh": ["油门踏板", "踏板位置传感器", "加速踏板"],
    "en": ["Accelerator Pedal", "Accelerator Pedal Sensor", "APS", "APP"]
  }
}
```

#### 4.5.2 文档问答服务
```typescript
interface QARequest {
  pdfId: string;
  question: string;
  context?: string; // 可选的上下文
}

interface QAResponse {
  question: string;
  answer: string;
  confidence: number; // 置信度 0-1
  sources: {          // 引用来源
    pageNumber: number;
    text: string;
  }[];
}

// RAG流程
async function answerQuestion(request: QARequest): Promise<QAResponse> {
  // 1. 从问题中提取关键实体
  const entities = await extractEntities(request.question);

  // 2. 检索相关段落(向量检索或关键词检索)
  const relevantSegments = await searchRelevantSegments(
    request.pdfId,
    entities
  );

  // 3. 构建上下文
  const context = relevantSegments
    .map(seg => `[页码${seg.pageNumber}] ${seg.text}`)
    .join('\n\n');

  // 4. 调用LLM
  const answer = await callLLM({
    prompt: buildQAPrompt(request.question, context),
    temperature: 0.1 // 低温度保证准确性
  });

  return {
    question: request.question,
    answer: answer.text,
    confidence: answer.confidence,
    sources: relevantSegments.map(seg => ({
      pageNumber: seg.pageNumber,
      text: seg.text
    }))
  };
}

// Prompt模板
const QA_PROMPT = `
你是汽车电路图分析专家。根据以下电路图文档内容,准确回答用户问题。

文档内容:
{context}

用户问题: {question}

要求:
1. 仅基于文档内容回答
2. 如果文档中没有相关信息,明确说明
3. 引用具体的页码和内容
4. 对于连接性问题,给出具体的针脚号和连接路径

回答:
`;

// API
POST /api/llm/qa
{
  "pdfId": "abc123",
  "question": "油门踏板连接到ECU的哪些针脚号?"
}

// Response
{
  "question": "油门踏板连接到ECU的哪些针脚号?",
  "answer": "根据电路图,油门踏板位置传感器(APS)通过以下针脚连接到ECU:\n1. APS信号1: 连接至ECU针脚A23\n2. APS信号2: 连接至ECU针脚A24\n3. 5V电源: 连接至ECU针脚A25\n4. 地线: 连接至ECU针脚A26\n\n具体连接路径见第15页电路图。",
  "confidence": 0.92,
  "sources": [
    {
      "pageNumber": 15,
      "text": "APS1信号线(白/蓝)连接至ECU插头X1的针脚A23..."
    },
    {
      "pageNumber": 15,
      "text": "APS2信号线(白/绿)连接至ECU插头X1的针脚A24..."
    }
  ]
}
```

---

## 5. 数据流设计

### 5.1 PDF加载流程
```
用户访问列表页
      ↓
GET /api/pdfs
      ↓
显示PDF列表(带缩略图)
      ↓
用户点击某个PDF
      ↓
GET /api/pdfs/:id
      ↓
GET /api/pdfs/:id/file
      ↓
PDF.js渲染PDF
      ↓
显示PDF内容+搜索面板
```

### 5.2 搜索流程
```
用户输入关键词"油门踏板"
      ↓
勾选"使用同义词扩展"(可选)
      ↓
POST /api/search
{
  "pdfId": "abc123",
  "keyword": "油门踏板",
  "useSynonyms": true
}
      ↓
后端处理:
1. 如果useSynonyms=true
   → POST /api/llm/synonyms
   → 获取同义词["油门踏板","APS","Accelerator Pedal"...]
2. 在索引中搜索所有关键词
3. 计算相关度分数
4. 排序结果
      ↓
返回搜索结果
      ↓
前端展示:
1. 显示结果列表(按相关度排序)
2. 在PDF上高亮所有匹配位置(颜色编码)
3. 自动跳转到最相关的位置
4. 显示"下一处"按钮
```

### 5.3 导航流程
```
用户点击"下一处"
      ↓
currentIndex++
      ↓
获取results[currentIndex]
      ↓
pdfViewer.goToPage(result.pageNumber)
      ↓
pdfViewer.scrollToHighlight(result.bbox)
      ↓
更新UI(显示 "3/15")
```

---

## 6. 性能优化策略

### 6.1 前端优化
- **PDF渲染**:
  - 使用PDF.js的虚拟滚动,只渲染可见页面
  - 预加载前后1-2页
  - 缩略图懒加载
- **搜索结果**:
  - 虚拟列表(react-window)渲染大量结果
  - 防抖输入(300ms)
- **状态管理**:
  - React Query缓存API响应
  - Zustand持久化搜索历史

### 6.2 后端优化
- **索引缓存**:
  - 首次访问时解析PDF并缓存索引
  - 使用SQLite存储索引,支持全文搜索
- **文件服务**:
  - Nginx直接服务PDF文件(bypass Node.js)
  - 启用gzip压缩
  - 设置合理的缓存头
- **LLM调用**:
  - 缓存常见关键词的同义词结果
  - 使用流式响应(Server-Sent Events)
  - 设置合理的超时时间

### 6.3 网络优化
- **HTTP/2**: 多路复用
- **CDN**: 静态资源加速(可选)
- **压缩**: Brotli/Gzip

---

## 7. 安全设计

### 7.1 认证与授权(可选)
- JWT token认证
- API rate limiting (防止滥用LLM接口)

### 7.2 输入验证
- PDF文件类型校验
- 文件大小限制(如50MB)
- XSS防护(sanitize用户输入)

### 7.3 环境变量管理
```env
# .env
NODE_ENV=production
PORT=3000

# LLM配置
OPENAI_API_KEY=sk-xxx
OPENAI_MODEL=gpt-4o-mini
# 或
ANTHROPIC_API_KEY=sk-ant-xxx
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022

# 路径配置
PDF_STORAGE_PATH=/app/pdfs
DATA_STORAGE_PATH=/app/data

# 功能开关
ENABLE_SYNONYM_SEARCH=true
ENABLE_QA=true
```

---

## 8. 部署架构

### 8.1 Docker部署
```yaml
# docker-compose.yml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./client/dist:/usr/share/nginx/html
      - ./server/pdfs:/usr/share/nginx/pdfs
    depends_on:
      - backend

  backend:
    build:
      context: ./server
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=production
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    volumes:
      - ./server/pdfs:/app/pdfs
      - ./server/data:/app/data
    ports:
      - "3000:3000"
```

### 8.2 Nginx配置
```nginx
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
        proxy_pass http://backend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 9. 开发计划

### 9.1 第一阶段: 基础功能(MVP)
- [ ] 项目初始化与环境搭建
- [ ] PDF列表页 + 详情页
- [ ] PDF.js集成与基础查看功能
- [ ] PDF文本提取与索引构建
- [ ] 关键词搜索(不含同义词)
- [ ] 相关度排序与结果展示
- [ ] 高亮显示与"下一处"导航

**预计时间**: 3-4天

### 9.2 第二阶段: LLM增强
- [ ] LLM服务集成(OpenAI/Claude)
- [ ] 同义词扩展功能
- [ ] 文档问答功能
- [ ] UI优化与交互改进

**预计时间**: 2-3天

### 9.3 第三阶段: 部署与优化
- [ ] Docker容器化
- [ ] Nginx配置
- [ ] 性能测试与优化
- [ ] 文档编写

**预计时间**: 1-2天

---

## 10. 技术难点与解决方案

### 10.1 PDF文本提取精度
**问题**: 电路图PDF可能包含图片文字(OCR)、复杂表格
**解决方案**:
- 使用pdf-parse + pdfjs-dist组合
- 对于图片文字,集成Tesseract.js OCR(可选)
- 针对表格使用特殊解析逻辑

### 10.2 相关度计算准确性
**问题**: 如何准确区分标题、表格、普通文本
**解决方案**:
- 基于字号判断(标题通常>16px)
- 基于布局判断(表格有规则的行列结构)
- 基于上下文判断(LLM辅助分类)

### 10.3 LLM响应速度
**问题**: 同义词扩展和问答可能较慢
**解决方案**:
- 使用fast模型(gpt-4o-mini, claude-3-5-haiku)
- 实现结果缓存
- 流式响应优化用户体验
- 异步处理+loading状态

### 10.4 大文件处理
**问题**: PDF文件可能很大(>100MB)
**解决方案**:
- 分页加载(不一次加载所有页面)
- 服务端流式传输
- 使用Range请求支持断点续传

---

## 11. 扩展功能(未来)

### 11.1 向量搜索
- 使用embedding实现语义搜索
- 支持模糊查询"类似油门的传感器"

### 11.2 批注功能
- 用户可在PDF上添加批注
- 批注持久化存储

### 11.3 多语言支持
- 界面国际化(i18n)
- 支持中英文切换

### 11.4 协作功能
- 多用户共享批注
- 实时协作(WebSocket)

---

## 12. 总结

本系统采用**前后端分离**架构,以**React + Express**为核心技术栈,通过**PDF.js**实现高质量的PDF渲染,利用**智能搜索算法**实现精准的关键词定位,并通过**LLM集成**提供同义词扩展和文档问答等增强功能。

整体设计遵循**模块化、可扩展、高性能**的原则,确保系统在处理大型PDF文件和复杂搜索需求时依然保持良好的用户体验。
