# PDF电路图搜索系统 - 快速启动指南

## 前置要求
- Node.js 20+
- npm
- 4个PDF文件放在 `server/pdfs/` 目录
- OpenAI API Key (用于LLM功能)

## 快速启动 (3步)

### 1. 下载PDF文件
从网盘下载4个PDF文件: https://mega.nz/folder/OAVghZgC#IE2fw3wD9DoSLkPElhvcnQ
将文件放入 `server/pdfs/` 目录

### 2. 安装依赖并配置
```bash
# 安装后端依赖
cd server
npm install
# 配置API Key
echo "OPENAI_API_KEY=your-key-here" >> .env
cd ..

# 安装前端依赖
cd client
npm install
cd ..
```

### 3. 启动服务
```bash
# 终端1: 启动后端
cd server && npm run dev

# 终端2: 启动前端
cd client && npm run dev
```

### 4. 访问系统
打开浏览器访问: http://localhost:5173

## 使用流程

1. **查看PDF列表** - 首页显示4个PDF文件
2. **进入详情页** - 点击任一PDF
3. **索引PDF** - 首次访问需要点击"立即索引"按钮
4. **搜索功能** - 右侧搜索面板输入关键词
5. **查看结果** - 结果按相关度排序，自动跳转到最相关位置
6. **下一处导航** - 点击"下一处"按钮浏览所有匹配项
7. **同义词搜索** - 勾选"使用同义词扩展"获取更多结果
8. **文档问答** - 点击右下角聊天图标提问

## 功能特性

### 核心功能
- ✅ PDF列表展示
- ✅ PDF在线阅读 (缩放、翻页、平移)
- ✅ 关键词搜索
- ✅ 智能相关度排序 (标题>表格>文本)
- ✅ 高亮显示与定位
- ✅ "下一处"导航

### LLM增强功能  
- ✅ 同义词扩展搜索
- ✅ 文档问答

## 故障排除

### 后端启动失败
- 检查Node.js版本: `node --version` (需要20+)
- 检查pdfs目录存在: `ls server/pdfs`
- 检查依赖安装: `cd server && npm install`

### 前端无法访问后端
- 确认后端运行在3000端口: `curl http://localhost:3000/health`
- 检查vite.config.ts中的proxy配置

### PDF索引失败
- 检查PDF文件格式是否正确
- 查看后端控制台错误日志

### LLM功能不工作
- 确认.env文件中OPENAI_API_KEY已配置
- 确认ENABLE_SYNONYM_SEARCH=true
- 检查API Key有效性

## 项目结构
```
pdf-circuit-search/
├── server/              # 后端服务
│   ├── src/
│   │   ├── controllers/ # 控制器
│   │   ├── services/    # 业务逻辑
│   │   ├── models/      # 数据模型
│   │   ├── routes/      # 路由
│   │   └── utils/       # 工具函数
│   ├── pdfs/            # PDF文件存储
│   └── data/            # 数据库文件
├── client/              # 前端应用
│   └── src/
│       ├── components/  # React组件
│       ├── pages/       # 页面
│       ├── services/    # API服务
│       └── stores/      # 状态管理
└── DEVELOPMENT_STEPS.md # 详细开发文档
```

## 技术栈
- 前端: React + TypeScript + Vite + Tailwind CSS + PDF.js
- 后端: Node.js + Express + TypeScript + SQLite
- LLM: OpenAI GPT-4o-mini

## 下一步

完成基础功能测试后，可以:
1. 添加更多PDF文件
2. 调整相关度算法权重
3. 优化搜索性能
4. Docker部署 (见DEVELOPMENT_STEPS.md第三阶段)
