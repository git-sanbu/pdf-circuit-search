# 系统启动指南

## 🚀 快速启动

### 首次启动或数据库迁移

如果遇到数据库错误（`no such column: fileHash`），需要先迁移数据库：

```bash
cd server

# 运行数据库迁移
node migrate-database.js

# 启动服务器
npm run dev
```

### 正常启动

```bash
cd server
npm run dev
```

## 📋 启动流程

### 阶段 1：服务器启动
```
🚀 PDF Search Server running on http://localhost:3000
```

### 阶段 2：PDF 初始化
```
📚 Initializing system...
Found X PDF files in ./pdfs
✓ Added PDF: document.pdf (24 pages)
  Indexing document.pdf...
  ✓ Indexed 142 text segments
```

### 阶段 3：OCR 初始化（首次启动较慢）
```
🔍 Initializing OCR processing...
[SmartOCR] Initializing OCR for all PDFs...
[SmartOCR] Found 4 PDFs in database
[SmartOCR] Processing PDF: document.pdf
[SmartOCR] File hash: 9d8f91b1...
[SmartOCR] File changed or no cache, starting OCR...
Converting PDF to images: 23 pages
Page 1/23 converted: document_page_1.png
Page 2/23 converted: document_page_2.png
...
PDF conversion completed: 23 images generated
[SmartOCR] Saved 23 OCR results
[SmartOCR] OCR processing completed successfully
```

### 阶段 4：完成
```
✓ OCR initialization complete:
  - Total PDFs: 4
  - Newly processed: 4
  - Using cache: 0
  - Failed: 0

✅ Server ready!
```

## ⏱️ 启动时间

### 首次启动（无缓存）
- **小型文档** (10-20页)：约 30-60 秒
- **中型文档** (20-50页)：约 1-3 分钟
- **大型文档** (50+页)：约 3-10 分钟

**注意**：首次启动需要对所有 PDF 执行 OCR，会比较慢。

### 二次启动（有缓存）
- **任何规模**：约 5-15 秒

系统会自动检测文件是否变更：
- 文件未变更 → 使用缓存（几乎瞬间）
- 文件已变更 → 重新 OCR（较慢）

## 🔧 环境配置

确保 `.env` 文件配置正确：

```bash
# OCR 配置
ENABLE_OCR=true
OCR_PROVIDER=aliyun

# 阿里云凭证（如果使用真实 OCR）
ALIYUN_ACCESS_KEY_ID=your-key-id
ALIYUN_ACCESS_KEY_SECRET=your-secret
ALIYUN_OCR_ENDPOINT=ocr-api.cn-hangzhou.aliyuncs.com

# 路径
PDF_STORAGE_PATH=./pdfs
DATA_STORAGE_PATH=./data
```

**注意**：当前使用模拟 OCR 数据，无需配置阿里云凭证也能运行。

## 📊 检查状态

### 1. 健康检查

```bash
curl http://localhost:3000/health
```

**响应**：
```json
{
  "status": "ok",
  "timestamp": "2025-10-14T05:30:00.000Z"
}
```

### 2. 查看 PDF 列表

```bash
curl http://localhost:3000/api/pdfs
```

### 3. 检查 OCR 状态

```bash
sqlite3 server/data/app.db "SELECT filename, ocrProcessed FROM pdfs;"
```

## ⚠️ 常见问题

### 问题 1：数据库错误 `no such column`

**错误信息**：
```
SqliteError: no such column: fileHash
```

**解决方法**：
```bash
node migrate-database.js
```

### 问题 2：启动很慢

**原因**：首次启动需要处理所有 PDF 的 OCR

**查看进度**：服务器会实时输出进度：
```
Page 1/23 converted: document_page_1.png
Page 2/23 converted: document_page_2.png
...
```

**加速方法**：
1. 暂时禁用 OCR：设置 `ENABLE_OCR=false`
2. 减少 PDF 数量：移走部分文件
3. 等待首次完成后，后续启动会很快

### 问题 3：OCR 失败

**日志显示**：
```
[SmartOCR] Failed: X
```

**检查**：
1. PDF 文件是否损坏
2. 磁盘空间是否足够（图片临时文件）
3. 查看详细错误日志

### 问题 4：端口占用

**错误信息**：
```
Error: listen EADDRINUSE: address already in use :::3000
```

**解决方法**：
```bash
# 方法1：停止旧进程
killall node

# 方法2：修改端口
# 在 .env 中设置：PORT=3001
```

## 🔄 重启策略

### 开发环境（自动重启）

```bash
npm run dev
```

使用 `tsx watch` 会自动监听文件变化并重启。

**注意**：每次重启都会重新检查 PDF 变更！

### 生产环境

```bash
# 构建
npm run build

# 启动
npm start
```

## 📝 启动日志说明

### 正常日志

```
✓ Added PDF: xxx         # 新增 PDF
Skipping existing PDF    # 跳过已存在的
✓ Indexed X segments     # 索引完成
Using cached OCR results # 使用缓存
Newly processed: X       # 本次处理数量
Using cache: X           # 使用缓存数量
```

### 警告日志（可忽略）

```
Warning: TT: undefined function: 32
Warning: Optional content group not found: 112R
```

这些是 pdf.js 的警告，不影响功能。

### 错误日志

```
✗ Failed to index xxx    # 索引失败
[SmartOCR] Error processing PDF  # OCR 失败
```

需要检查 PDF 文件或查看详细错误。

## 🧹 清理和重置

### 清除 OCR 缓存（强制重新处理）

```bash
# 方法1：删除数据库
rm server/data/app.db

# 方法2：只删除 OCR 结果
sqlite3 server/data/app.db "DELETE FROM ocr_results;"
sqlite3 server/data/app.db "UPDATE pdfs SET ocrProcessed = 0, fileHash = NULL;"
```

### 清理临时文件

```bash
# 清理 PDF 转换的图片（如果有残留）
rm -rf server/pdfs/*_page_*.png
rm -rf server/pdfs/pdf_images/
```

## 📈 性能监控

### 查看 OCR 统计

```bash
sqlite3 server/data/app.db <<EOF
SELECT
  COUNT(*) as total_pdfs,
  SUM(CASE WHEN ocrProcessed = 1 THEN 1 ELSE 0 END) as processed,
  SUM(CASE WHEN ocrProcessed = 0 THEN 1 ELSE 0 END) as unprocessed
FROM pdfs;
EOF
```

### 查看 OCR 结果数量

```bash
sqlite3 server/data/app.db "SELECT COUNT(*) FROM ocr_results;"
```

## 🎯 最佳实践

### 1. 开发环境

- 首次启动后不要频繁重启
- 使用 `tsx watch` 自动重启，但 OCR 结果会保持

### 2. 生产环境

- 首次部署时预留足够时间完成 OCR
- 监控磁盘空间（临时图片文件）
- 定期备份数据库

### 3. 大量 PDF

如果有很多 PDF 文件：

1. **分批处理**
   ```bash
   # 先处理少量
   mkdir pdfs_batch1 pdfs_batch2
   mv pdfs/*.pdf pdfs_batch1/
   mv pdfs_batch1/first10* pdfs/
   npm run dev  # 等待完成
   mv pdfs_batch1/*.pdf pdfs/
   npm run dev  # 处理剩余
   ```

2. **禁用自动 OCR**
   ```bash
   ENABLE_OCR=false npm run dev
   # 手动触发 OCR（如果实现了手动API）
   ```

## 🆘 获取帮助

### 查看完整日志

```bash
npm run dev 2>&1 | tee server.log
```

### 调试模式

```bash
NODE_ENV=development npm run dev
```

### 查看数据库内容

```bash
sqlite3 server/data/app.db
.tables
.schema pdfs
.schema ocr_results
SELECT * FROM pdfs LIMIT 5;
```

## ✅ 启动检查清单

在启动前确认：

- [ ] Node.js 版本 >= 18
- [ ] 已安装依赖：`npm install`
- [ ] `.env` 文件存在并配置
- [ ] `pdfs/` 目录存在
- [ ] `data/` 目录存在
- [ ] 端口 3000 未被占用
- [ ] 如果首次启动，预留足够时间

启动后确认：

- [ ] 看到 "Server ready!" 消息
- [ ] 健康检查返回 OK：`curl http://localhost:3000/health`
- [ ] 可以访问 PDF 列表：`curl http://localhost:3000/api/pdfs`
- [ ] OCR 初始化完成（查看日志统计）

---

**提示**：首次启动会较慢，这是正常的！系统正在为所有 PDF 构建搜索索引和 OCR 缓存。完成后，后续启动会非常快。
