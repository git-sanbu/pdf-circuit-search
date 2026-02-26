# PDF 电路图智能搜索系统

一个专为电路图文档设计的智能搜索系统，支持关键词搜索、相关度排序、同义词扩展和智能问答。

## 功能特性

-  **PDF 在线阅读器** - 支持缩放、平移、翻页
-  **智能搜索** - 关键词搜索 + 相关度排序（标题 > 表格 > 文本）
-  **高亮定位** - 自动跳转到最相关位置并高亮显示
-  **同义词扩展** - AI 驱动的关键词扩展（如：油门踏板 = APS = Accelerator Pedal）
-  **智能问答** - 基于文档内容的 AI 问答
-  **OCR 支持** - 扫描版 PDF 的文字识别（阿里云 OCR）

## 快速开始

### 前置要求

- Node.js 20+
- OpenAI API Key（LLM 功能）
- 阿里云 AccessKey（OCR 功能，可选）

### 安装运行

```bash
# 1. 克隆项目
git clone <repository-url>
cd pdf-circuit-search

# 2. 安装依赖
cd server && npm install
cd ../client && npm install

# 3. 准备 PDF 文件
mkdir -p server/pdfs
cp /path/to/your/*.pdf server/pdfs/

# 4. 配置环境变量
cd server
cp .env.example .env
# 编辑 .env 文件，配置 API Key

# 5. 启动服务
# 终端 1: 启动后端
cd server
npm run dev

# 终端 2: 启动前端
cd client
npm run dev

# 6. 访问应用
# 打开浏览器访问 http://localhost:5173
```

### 环境变量配置

编辑 `server/.env` 文件：

```env
# LLM 配置（必需）
OPENAI_API_KEY=your-api-key-here
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini

# 功能开关
ENABLE_SYNONYM_SEARCH=true
ENABLE_QA=true

# OCR 配置（可选，处理扫描版 PDF）
ENABLE_OCR=true
ALIYUN_ACCESS_KEY_ID=your-access-key-id
ALIYUN_ACCESS_KEY_SECRET=your-access-key-secret
```

## 使用说明

### 1. 索引 PDF

首次使用时：
1. 打开应用，选择一个 PDF
2. 点击"立即索引"按钮
3. 系统自动提取文本和结构
4. 如果是扫描版 PDF，自动进行 OCR 识别

### 2. 基础搜索

1. 在搜索框输入关键词，例如："油门踏板"
2. 点击"搜索"
3. 系统自动跳转到最相关位置并高亮显示
4. 使用"下一处"按钮浏览其他匹配项

### 3. 同义词搜索

1. 勾选"使用同义词扩展"
2. 输入关键词搜索
3. AI 自动识别同义词、缩写、翻译进行扩展搜索

### 4. 文档问答

1. 点击右下角聊天图标
2. 输入问题，例如："油门踏板连接到 ECU 的哪些针脚号？"
3. AI 基于文档内容回答并引用页码

## 技术架构

### 技术栈

**前端**
- React 19 + TypeScript - UI 框架
- Vite - 构建工具
- PDF.js - PDF 渲染
- TanStack Query - 数据管理
- Zustand - 状态管理
- Tailwind CSS - 样式

**后端**
- Node.js 20 + TypeScript
- Express - Web 框架
- Better-SQLite3 - 本地数据库
- OpenAI SDK - LLM 集成
- 阿里云 OCR SDK - OCR 识别
- Sharp - 图片处理

### 核心算法：相关度排序

```typescript
相关度分数 = 基础权重 × 完全匹配加成 × 频率加成 × 位置加成

其中：
- 基础权重：标题(3.0) > 表格(2.0) > 文本(1.0)
- 完全匹配加成：完全匹配时 ×2
- 频率加成：每出现一次 +20%
- 位置加成：越靠前越高（最多 +30%）
```

### 系统架构

```
用户浏览器
    ↓ (HTTP API)
Express 服务器
    ↓
┌──────────┬──────────┬──────────┐
│ PDF 解析  │ 搜索引擎  │ LLM 服务 │
└──────────┴──────────┴──────────┘
    ↓          ↓          ↓
┌──────────┬──────────┬──────────┐
│ OCR 服务  │ SQLite   │ OpenAI  │
└──────────┴──────────┴──────────┘
```

## 技术选型与决策

### 为什么使用 Node.js？

 **快速开发** - JavaScript 全栈，前后端技术统一
 **异步 I/O** - 适合处理文件读写和 API 调用
 **生态丰富** - PDF 处理、OCR、LLM 等库完善

### OCR 方案演变

#### 阶段 1：基于文本层（初版）
- **方案**：直接提取 PDF 文本层
- **问题**：扫描版 PDF 无文本层或内容很少

#### 阶段 2：本地 OCR（已废弃）
- **方案**：OCRmyPDF + Tesseract
- **问题**：
  - 识别准确率低（尤其中文）
  - 需要安装复杂的本地依赖
  - 跨平台兼容性差

#### 阶段 3：阿里云 OCR（当前）
- **方案**：PDF → 图片 → 阿里云通用文字识别 API
- **优势**：
  -  识别准确率高
  -  支持中英文混合
  -  返回位置信息，支持精确高亮
  -  无需本地依赖

### 内存优化

#### 问题
部署到小内存服务器时，处理大 PDF 会卡死。

#### 原因
之前以 PDF 为单位处理，所有页面的图片同时存在内存中。

#### 解决方案
改为逐页处理，**每张图片处理完立即清空缓存**：

```typescript
// 优化前：一次性转换所有页
const allImages = await pdfToImages(pdfPath); // 内存占用大
for (const image of allImages) {
  await ocrService.recognize(image);
}
await cleanup(allImages); // 最后统一清理

// 优化后：逐页处理
for (let page = 1; page <= totalPages; page++) {
  const image = await convertPage(pdfPath, page);
  await ocrService.recognize(image);
  await fs.unlink(image); // 立即清理 
}
```

**效果**：
- 内存占用从 ~2GB 降低到 ~200MB
- 支持在 512MB 内存的服务器上运行

### 为什么使用阿里云 OCR 而非 Tesseract？

| 对比项 | Tesseract (本地) | 阿里云 OCR (云端) |
|--------|-----------------|------------------|
| 识别准确率 | ⭐⭐⭐ 70% | ⭐⭐⭐⭐⭐ 95%+ |
| 中文识别 | ⭐⭐ 需要额外训练 | ⭐⭐⭐⭐⭐ 原生支持 |
| 安装部署 | ❌ 复杂，需要多个依赖 |  无需本地依赖 |
| 位置信息 | ❌ 不精确 |  返回精确坐标 |
| 维护成本 | ❌ 高 |  低 |
| 费用 |  免费 | ⚠️ 按量计费 |

**结论**：对于生产环境，阿里云 OCR 的准确率和易用性远超本地方案。

### 为什么使用 SQLite 而非 MongoDB？

 **无需独立服务** - 内嵌数据库，简化部署
 **全文索引** - SQLite FTS5 高效的全文搜索
 **性能足够** - 对于中小型文档集合完全满足
 **同步 API** - 代码更清晰，避免回调地狱

## 项目结构

```
pdf-circuit-search/
├── client/              # React 前端
│   ├── src/
│   │   ├── components/  # React 组件
│   │   ├── pages/       # 页面
│   │   ├── services/    # API 客户端
│   │   └── stores/      # 状态管理
│   └── package.json
│
├── server/              # Node.js 后端
│   ├── src/
│   │   ├── controllers/ # API 控制器
│   │   ├── services/    # 业务逻辑
│   │   │   ├── pdfParser.ts        # PDF 解析
│   │   │   ├── searchEngine.ts     # 搜索引擎
│   │   │   ├── llmService.ts       # LLM 服务
│   │   │   ├── aliyunOCRService.ts # OCR 服务
│   │   │   └── database.ts         # 数据库
│   │   ├── models/      # 数据模型
│   │   └── routes/      # 路由
│   ├── pdfs/            # PDF 存储
│   └── data/            # SQLite 数据库
│
└── docker-compose.yml   # Docker 配置
```

## Docker 部署

```bash
# 1. 构建前端
cd client
npm run build

# 2. 启动 Docker
docker-compose up -d

# 3. 访问应用
# http://localhost
```

## 常见问题

### 1. 后端启动失败

```bash
# 检查 Node 版本
node --version  # 需要 20+

# 重新安装依赖
cd server
rm -rf node_modules package-lock.json
npm install
```

### 2. PDF 索引失败

- 检查 PDF 文件是否在 `server/pdfs/` 目录
- 查看后端控制台日志
- 确认 PDF 文件未加密

### 3. OCR 识别失败

- 检查阿里云 AccessKey 配置
- 确认阿里云账号已开通 OCR 服务
- 测试 API 连接：`cd server && npx tsx test-aliyun-ocr.ts`

### 4. LLM 功能不工作

- 检查 OpenAI API Key 是否正确
- 确认 API 配额未用完
- 测试网络连接

### 5. 内存不足

增加 Node.js 内存限制：

```json
// package.json
"dev": "NODE_OPTIONS='--max-old-space-size=4096' tsx watch src/app.ts"
```

## API 文档

### 获取 PDF 列表

```http
GET /api/pdfs
```

### 索引 PDF

```http
POST /api/pdfs/:id/index
```

### 执行搜索

```http
POST /api/search
Content-Type: application/json

{
  "pdfId": "abc123",
  "keyword": "油门踏板",
  "useSynonyms": true
}
```

### 文档问答

```http
POST /api/llm/qa
Content-Type: application/json

{
  "pdfId": "abc123",
  "question": "油门踏板连接到哪些针脚？"
}
```

## 更新日志

### v1.0.0 (2025-10-15)

**新增**
- ✨ PDF 阅读器和智能搜索
- ✨ LLM 同义词扩展和问答
- ✨ 阿里云 OCR 支持

**优化**
- ⚡ 简化 OCR 架构
- ⚡ 优化内存使用（逐页清理图片缓存）
- ⚡ 移除 pdf-parse 依赖

**修复**
- 🐛 修复大 PDF 处理时的内存溢出问题
- 🐛 修复 OCR 图片缓存未清理的问题

## 开源协议

MIT License

## 相关文档

- [阿里云 OCR 配置指南](./ALIYUN_OCR_SETUP.md)
- [详细架构文档](./ARCHITECTURE.md)
- [OCR 简化总结](./OCR_SIMPLIFICATION_SUMMARY.md)

---
