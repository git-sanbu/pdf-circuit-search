# PDF电路图文档内搜索系统

一个智能的PDF电路图搜索系统，支持关键词搜索、相关度排序、同义词扩展和文档问答功能。

## ✨ 功能特性

### 核心功能
- ✅ **PDF文件展示** - 列表页展示4个PDF文件，支持预览
- ✅ **PDF在线阅读** - 支持缩放(50%-300%)、平移、翻页
- ✅ **关键词搜索** - 快速搜索元器件关键词
- ✅ **智能相关度排序** - 标题 > 表格 > 普通文本
- ✅ **高亮显示** - 自动高亮所有匹配位置
- ✅ **智能定位** - 自动跳转到最相关位置
- ✅ **"下一处"导航** - 按相关度依次浏览所有匹配项

### LLM增强功能
- ✅ **同义词搜索** - 自动扩展关键词（如：油门踏板 = APS = Accelerator Pedal）
- ✅ **文档问答** - 智能回答电路图连接性问题

## 🚀 快速开始

### 前置要求
- Node.js 20+
- npm
- OpenAI API Key（用于LLM功能）

### 1. 准备PDF文件

从网盘下载4个PDF文件：
```
https://mega.nz/folder/OAVghZgC#IE2fw3wD9DoSLkPElhvcnQ
```

将PDF文件放入：
```bash
server/pdfs/
```

### 2. 安装依赖

```bash
# 安装后端依赖
cd server
npm install
cd ..

# 安装前端依赖
cd client
npm install
cd ..
```

### 3. 配置环境变量

编辑 `server/.env` 文件，配置OpenAI API Key：
```env
OPENAI_API_KEY=your-api-key-here
OPENAI_MODEL=gpt-4o-mini
ENABLE_SYNONYM_SEARCH=true
ENABLE_QA=true
```

### 4. 启动服务

**开发模式**（推荐）：

```bash
# 终端1: 启动后端
cd server
npm run dev

# 终端2: 启动前端
cd client
npm run dev
```

**生产模式（Docker）**：

```bash
# 构建前端
cd client
npm run build
cd ..

# 启动Docker服务
docker-compose up -d
```

### 5. 访问系统

- 开发模式: http://localhost:5173
- 生产模式: http://localhost

## 📖 使用说明

### 基础搜索流程

1. **查看PDF列表** - 首页显示所有PDF文件
2. **选择PDF** - 点击任意PDF卡片进入详情页
3. **索引PDF** - 首次访问需点击"立即索引"按钮（约10-30秒）
4. **输入关键词** - 右侧搜索框输入元器件名称，如"油门踏板"
5. **查看结果** - 系统自动跳转到最相关位置，PDF上高亮显示
6. **浏览匹配项** - 点击"下一处"按钮查看其他匹配位置

### 同义词搜索

1. 勾选"使用同义词扩展"选项
2. 输入关键词搜索
3. 系统将自动查找同义词并扩展搜索范围
4. 结果列表显示扩展的关键词

### 文档问答

1. 点击右下角聊天图标
2. 输入问题，例如："油门踏板连接到ECU的哪些针脚号？"
3. AI会基于文档内容回答，并引用页码来源

## 🏗️ 技术架构

### 前端技术栈
- **React 19** - UI框架
- **TypeScript** - 类型安全
- **Vite** - 构建工具
- **React Router** - 路由管理
- **TanStack Query** - 数据获取与缓存
- **Zustand** - 状态管理
- **PDF.js** - PDF渲染引擎
- **Tailwind CSS** - 样式框架
- **Lucide Icons** - 图标库

### 后端技术栈
- **Node.js 20** - 运行环境
- **Express** - Web框架
- **TypeScript** - 类型安全
- **Better-SQLite3** - 本地数据库
- **PDF.js** - PDF解析
- **OpenAI** - LLM服务

### 部署技术
- **Docker** - 容器化
- **Nginx** - 反向代理
- **Docker Compose** - 编排工具

## 📁 项目结构

```
pdf-circuit-search/
├── server/                  # 后端服务
│   ├── src/
│   │   ├── controllers/    # API控制器
│   │   ├── services/       # 业务逻辑
│   │   │   ├── database.ts      # 数据库服务
│   │   │   ├── pdfParser.ts     # PDF解析
│   │   │   ├── searchEngine.ts  # 搜索引擎
│   │   │   └── llmService.ts    # LLM服务
│   │   ├── models/         # 数据模型
│   │   ├── routes/         # 路由定义
│   │   ├── utils/          # 工具函数
│   │   └── app.ts          # 应用入口
│   ├── pdfs/               # PDF文件存储
│   ├── data/               # 数据库文件
│   └── package.json
│
├── client/                  # 前端应用
│   ├── src/
│   │   ├── components/     # React组件
│   │   │   ├── PDFList.tsx      # PDF列表
│   │   │   ├── PDFViewer.tsx    # PDF查看器
│   │   │   ├── SearchPanel.tsx  # 搜索面板
│   │   │   └── LLMChat.tsx      # 问答窗口
│   │   ├── pages/          # 页面组件
│   │   │   ├── HomePage.tsx     # 首页
│   │   │   └── PDFDetailPage.tsx # 详情页
│   │   ├── services/       # API服务
│   │   ├── stores/         # 状态管理
│   │   ├── types/          # 类型定义
│   │   ├── App.tsx         # 应用组件
│   │   └── main.tsx        # 入口文件
│   └── package.json
│
├── docker-compose.yml       # Docker编排
├── Dockerfile.server        # 后端镜像
├── nginx.conf               # Nginx配置
├── ARCHITECTURE.md          # 架构文档
├── DEVELOPMENT_STEPS.md     # 开发步骤
└── README.md                # 项目说明
```

## 🔧 API接口

### PDF管理
- `GET /api/pdfs` - 获取PDF列表
- `GET /api/pdfs/:id` - 获取PDF详情
- `GET /api/pdfs/:id/file` - 获取PDF文件
- `POST /api/pdfs/:id/index` - 索引PDF

### 搜索
- `POST /api/search` - 执行搜索
  ```json
  {
    "pdfId": "abc123",
    "keyword": "油门踏板",
    "useSynonyms": true
  }
  ```

### LLM
- `POST /api/llm/synonyms` - 获取同义词
- `POST /api/llm/qa` - 文档问答

## ⚙️ 配置说明

### 环境变量 (.env)

```env
# 服务配置
NODE_ENV=development
PORT=3000

# LLM配置
OPENAI_API_KEY=sk-xxx
OPENAI_MODEL=gpt-4o-mini

# 路径配置
PDF_STORAGE_PATH=./pdfs
DATA_STORAGE_PATH=./data

# 功能开关
ENABLE_SYNONYM_SEARCH=true
ENABLE_QA=true
```

## 🐛 故障排除

### 问题1: 后端启动失败
```bash
# 检查Node版本
node --version  # 需要20+

# 重新安装依赖
cd server
rm -rf node_modules package-lock.json
npm install
```

### 问题2: 前端无法连接后端
```bash
# 检查后端健康状态
curl http://localhost:3000/health

# 检查端口占用
lsof -i :3000
lsof -i :5173
```

### 问题3: PDF索引失败
- 确认PDF文件在 `server/pdfs/` 目录
- 查看后端控制台错误日志
- 确认PDF文件格式正确（非加密、非扫描件）

### 问题4: LLM功能不工作
- 确认 `.env` 文件中 `OPENAI_API_KEY` 已配置
- 测试API Key有效性
- 检查网络连接

## 📊 性能优化

- **前端**: PDF分页加载、虚拟滚动、React Query缓存
- **后端**: SQLite索引、LLM结果缓存
- **部署**: Nginx静态文件服务、gzip压缩

## 📝 开发文档

- [系统架构文档](./ARCHITECTURE.md)
- [详细开发步骤](./DEVELOPMENT_STEPS.md)
- [快速启动指南](./QUICKSTART.md)

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📄 许可证

MIT License

---

**开发团队**: Claude Code
**版本**: 1.0.0
**最后更新**: 2025-10-10
