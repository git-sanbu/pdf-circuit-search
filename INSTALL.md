# 📦 安装与部署指南

## 系统要求

- **操作系统**: Linux / macOS / Windows (WSL)
- **Node.js**: 20.0.0+
- **npm**: 10.0.0+
- **内存**: 至少2GB可用
- **磁盘**: 至少500MB可用空间
- **网络**: 需要访问OpenAI API (用于LLM功能)

---

## 📥 安装步骤

### 1. 准备PDF文件

从网盘下载4个PDF文件：
```
https://mega.nz/folder/OAVghZgC#IE2fw3wD9DoSLkPElhvcnQ
```

将下载的PDF文件放入项目目录：
```bash
mkdir -p server/pdfs
# 将下载的PDF文件移动到 server/pdfs/ 目录
```

### 2. 安装后端依赖

```bash
cd server
npm install
```

预计需要1-3分钟，将安装以下主要依赖：
- express (Web框架)
- better-sqlite3 (数据库)
- pdfjs-dist (PDF解析)
- openai (LLM服务)

### 3. 配置环境变量

编辑 `server/.env` 文件：
```bash
cd server
nano .env  # 或使用其他编辑器
```

**必需配置** (LLM功能):
```env
OPENAI_API_KEY=sk-your-actual-api-key-here
```

**完整配置示例**:
```env
NODE_ENV=development
PORT=3000

# LLM配置
OPENAI_API_KEY=sk-your-actual-api-key-here
OPENAI_MODEL=gpt-4o-mini

# 路径配置
PDF_STORAGE_PATH=./pdfs
DATA_STORAGE_PATH=./data

# 功能开关
ENABLE_SYNONYM_SEARCH=true
ENABLE_QA=true
```

> 💡 如果暂时没有OpenAI API Key，可以先跳过LLM配置。基础搜索功能不依赖LLM。

### 4. 安装前端依赖

```bash
cd ../client
npm install
```

预计需要1-3分钟，将安装以下主要依赖：
- react (UI框架)
- pdfjs-dist (PDF渲染)
- @tanstack/react-query (数据管理)
- tailwindcss (样式框架)

---

## 🚀 启动服务

### 方式1: 手动启动（推荐用于开发）

**终端1 - 启动后端**:
```bash
cd server
npm run dev
```

看到以下输出表示启动成功：
```
==================================================
🚀 PDF Search Server running on http://localhost:3000
==================================================

📚 Initializing PDF database...
Found 4 PDF files in /path/to/pdfs
✓ Added PDF: doc1.pdf (50 pages)
✓ Added PDF: doc2.pdf (75 pages)
...

✅ Server ready!
```

**终端2 - 启动前端**:
```bash
cd client
npm run dev
```

看到以下输出表示启动成功：
```
  VITE v5.0.11  ready in 423 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### 方式2: 使用启动脚本（自动化）

```bash
./START.sh auto
```

服务将在后台启动，日志输出到：
- `server.log` - 后端日志
- `client.log` - 前端日志

停止服务：
```bash
cat .pids | xargs kill
```

### 方式3: Docker部署（生产环境）

**前提**: 安装Docker和Docker Compose

1. 构建前端：
```bash
cd client
npm run build
cd ..
```

2. 创建环境变量文件：
```bash
echo "OPENAI_API_KEY=your-key-here" > .env
```

3. 启动容器：
```bash
docker-compose up -d
```

4. 查看日志：
```bash
docker-compose logs -f
```

5. 停止服务：
```bash
docker-compose down
```

---

## 🌐 访问系统

### 开发模式
打开浏览器访问：
```
http://localhost:5173
```

### Docker模式
打开浏览器访问：
```
http://localhost
```

---

## ✅ 验证安装

### 1. 检查后端健康状态
```bash
curl http://localhost:3000/health
```

预期输出：
```json
{"status":"ok","timestamp":"2025-10-10T..."}
```

### 2. 检查PDF列表API
```bash
curl http://localhost:3000/api/pdfs
```

预期输出：
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "filename": "doc1.pdf",
      "pageCount": 50,
      ...
    }
  ]
}
```

### 3. 访问前端页面
1. 打开浏览器访问 http://localhost:5173
2. 应该看到4个PDF文件卡片
3. 点击任一PDF进入详情页
4. 点击"立即索引"按钮
5. 等待索引完成（约10-30秒）
6. 在右侧搜索框输入关键词测试搜索

---

## 🔧 故障排除

### 问题1: 后端端口被占用
```
Error: listen EADDRINUSE: address already in use :::3000
```

**解决方案**:
```bash
# 查找占用端口的进程
lsof -i :3000

# 杀死进程
kill -9 <PID>

# 或修改端口
# 编辑 server/.env，修改 PORT=3001
```

### 问题2: 前端端口被占用
```
Port 5173 is in use
```

**解决方案**:
```bash
# 查找占用端口的进程
lsof -i :5173

# 杀死进程
kill -9 <PID>
```

### 问题3: npm install 失败
```
npm ERR! code ELIFECYCLE
```

**解决方案**:
```bash
# 清理缓存
npm cache clean --force

# 删除node_modules
rm -rf node_modules package-lock.json

# 重新安装
npm install
```

### 问题4: better-sqlite3 编译失败
```
Error: Failed to compile better-sqlite3
```

**解决方案**:
```bash
# 安装编译工具 (Ubuntu/Debian)
sudo apt-get install build-essential python3

# 安装编译工具 (macOS)
xcode-select --install

# 重新安装
cd server
rm -rf node_modules
npm install
```

### 问题5: PDF文件未找到
```
Found 0 PDF files
```

**解决方案**:
```bash
# 确认PDF文件位置
ls -la server/pdfs/

# 确保文件扩展名为 .pdf
# 确保文件有读取权限
chmod 644 server/pdfs/*.pdf
```

### 问题6: OpenAI API调用失败
```
LLM Synonym Error: ...
```

**解决方案**:
1. 检查API Key是否正确
2. 检查API Key余额
3. 测试API连接：
```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```
4. 如果API不可用，将 `ENABLE_SYNONYM_SEARCH=false` 禁用LLM功能

---

## 📊 性能调优

### 后端优化
```env
# server/.env

# 增加并发连接数
NODE_OPTIONS=--max-old-space-size=4096
```

### 前端优化
```bash
# 生产构建优化
cd client
npm run build -- --mode production

# 结果在 client/dist/
```

---

## 🔐 安全建议

### 开发环境
- ✅ 使用 `.env` 文件管理敏感信息
- ✅ 不要提交 `.env` 到版本控制

### 生产环境
- 🔒 使用环境变量管理API Key
- 🔒 启用HTTPS
- 🔒 配置CORS白名单
- 🔒 添加rate limiting
- 🔒 定期更新依赖

---

## 📝 常用命令

### 开发
```bash
# 启动开发服务器
cd server && npm run dev
cd client && npm run dev

# 查看日志
tail -f server.log
tail -f client.log
```

### 构建
```bash
# 构建后端
cd server && npm run build

# 构建前端
cd client && npm run build
```

### 清理
```bash
# 清理构建产物
rm -rf server/dist
rm -rf client/dist

# 清理依赖
rm -rf server/node_modules
rm -rf client/node_modules

# 清理数据库（谨慎）
rm -rf server/data/*
```

---

## 🎓 下一步

安装成功后，建议：

1. 📖 阅读 [README.md](./README.md) 了解功能
2. 🏗️ 查看 [ARCHITECTURE.md](./ARCHITECTURE.md) 理解架构
3. 💻 参考 [DEVELOPMENT_STEPS.md](./DEVELOPMENT_STEPS.md) 进行二次开发
4. 🚀 使用 [QUICKSTART.md](./QUICKSTART.md) 快速上手

---

## 💬 获取帮助

如遇到问题：
1. 查看项目文档
2. 检查日志文件
3. 搜索GitHub Issues
4. 提交新Issue

---

**文档版本**: 1.0.0  
**最后更新**: 2025-10-10
