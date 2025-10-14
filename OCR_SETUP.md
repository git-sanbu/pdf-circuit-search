# OCR 功能配置指南

本文档说明如何在 PDF 电路图搜索系统中启用 OCR（光学字符识别）功能，用于处理扫描版 PDF。

## 功能说明

OCR 预处理功能可以：
- ✅ **为扫描版 PDF 添加文本层** - 让纯图像的 PDF 变得可搜索
- ✅ **去倾斜** - 自动纠正扫描时的倾斜
- ✅ **自动旋转** - 修正页面方向
- ✅ **智能跳过** - 已有文本的页面不重复处理（节省时间）
- ✅ **多语言支持** - 支持英文、中文等多种语言

## 安装 OCRmyPDF

### Ubuntu/Debian

```bash
# 安装 OCRmyPDF
sudo apt update
sudo apt install ocrmypdf

# 安装中文语言包（如需要）
sudo apt install tesseract-ocr-chi-sim tesseract-ocr-chi-tra
```

### macOS

```bash
# 使用 Homebrew 安装
brew install ocrmypdf

# 安装中文语言包
brew install tesseract-lang
```

### Windows (WSL)

在 WSL2 中按 Ubuntu 方式安装：
```bash
sudo apt update
sudo apt install ocrmypdf tesseract-ocr-chi-sim
```

### 验证安装

```bash
ocrmypdf --version
```

应该输出类似：`ocrmypdf 14.x.x`

### 检查语言包

```bash
tesseract --list-langs
```

应该包含：
- `eng` (英文)
- `chi_sim` (简体中文)
- `chi_tra` (繁体中文，可选)

## 配置系统

### 1. 环境变量配置

编辑 `server/.env` 文件：

```env
# OCR配置
ENABLE_OCR=true                    # 启用 OCR 功能
OCR_LANGUAGE=eng+chi_sim           # OCR 语言（英文+简体中文）
OCR_DESKEW=true                    # 启用去倾斜
OCR_ROTATE_PAGES=true              # 启用自动旋转
OCR_SKIP_TEXT=true                 # 跳过已有文本的页面
```

### 2. 语言配置说明

根据你的 PDF 内容选择合适的语言：

- **仅英文**: `OCR_LANGUAGE=eng`
- **仅中文**: `OCR_LANGUAGE=chi_sim`
- **中英文混合**: `OCR_LANGUAGE=eng+chi_sim` (推荐)
- **其他语言**: 参考 [Tesseract 语言代码](https://tesseract-ocr.github.io/tessdoc/Data-Files-in-different-versions.html)

### 3. 性能配置

OCR 处理可能需要较长时间，可以调整：

**ocrService.ts** 中的并发数：
```typescript
args.push('--jobs', '4');  // 增加到 8 或更多（取决于 CPU 核心数）
```

**超时时间**：
```typescript
timeout: 300000,  // 5分钟，可根据需要调整
```

## 使用方法

### 1. 自动 OCR（推荐）

索引 PDF 时自动进行 OCR 预处理：

```bash
cd server
npm run dev
```

然后在前端点击"立即索引"按钮，系统会：
1. 检测 PDF 是否为扫描版
2. 自动调用 OCRmyPDF 添加文本层
3. 解析处理后的 PDF 并建立索引

### 2. 手动禁用 OCR

如果想跳过 OCR（PDF 已有文本层）：

在前端发起索引请求时传递参数：
```javascript
await api.post(`/api/pdfs/${id}/index`, { enableOCR: false });
```

### 3. 预处理现有 PDF

批量预处理 PDF 文件：

```bash
cd server

# 单个文件
ocrmypdf --deskew --rotate-pages --skip-text \
  -l eng+chi_sim \
  pdfs/original.pdf pdfs/original_ocr.pdf

# 批量处理
for f in pdfs/*.pdf; do
  ocrmypdf --deskew --rotate-pages --skip-text \
    -l eng+chi_sim \
    "$f" "${f%.pdf}_ocr.pdf"
done
```

## 工作流程

```
原始 PDF (扫描版)
    ↓
OCRmyPDF 预处理
    ├─ 检测页面方向
    ├─ 去倾斜
    ├─ OCR 识别文字
    └─ 添加文本层
    ↓
可搜索的 PDF
    ↓
PDF.js 解析
    ↓
文本片段索引
    ↓
搜索引擎
```

## 性能优化建议

### 1. 区分文档类型

- **已有文本层的 PDF**: 设置 `OCR_SKIP_TEXT=true`，自动跳过
- **纯扫描版 PDF**: 首次索引时进行 OCR，保存处理后的版本

### 2. 预先批量处理

对于大量扫描版 PDF，建议预先处理：

```bash
#!/bin/bash
# 批量 OCR 预处理脚本

INPUT_DIR="./pdfs"
OUTPUT_DIR="./pdfs_ocr"

mkdir -p "$OUTPUT_DIR"

for pdf in "$INPUT_DIR"/*.pdf; do
  filename=$(basename "$pdf")
  echo "Processing: $filename"

  ocrmypdf \
    --deskew \
    --rotate-pages \
    --skip-text \
    --jobs 4 \
    -l eng+chi_sim \
    "$pdf" "$OUTPUT_DIR/$filename"
done

echo "Done!"
```

### 3. 缓存策略

系统会保留 OCR 处理后的文件：
```typescript
// pdfController.ts:137
console.log('Keeping OCR-processed file for future use');
```

下次索引时直接使用处理后的版本。

## 故障排除

### 问题 1: OCRmyPDF 未安装

**错误信息**:
```
OCRmyPDF is not installed or not in PATH
```

**解决方法**:
```bash
# 检查安装
which ocrmypdf

# 重新安装
sudo apt install ocrmypdf
```

### 问题 2: 语言包缺失

**错误信息**:
```
Error: Tesseract failed: tesseract: error while loading shared libraries
```

**解决方法**:
```bash
# 安装语言包
sudo apt install tesseract-ocr-eng tesseract-ocr-chi-sim

# 验证
tesseract --list-langs
```

### 问题 3: OCR 处理时间过长

**优化方案**:
1. 增加并发任务数：`--jobs 8`
2. 降低图像 DPI：`--oversample 150`
3. 跳过清理步骤：不使用 `--clean`

### 问题 4: 内存不足

**错误信息**:
```
OCR preprocessing failed: killed
```

**解决方法**:
1. 减少并发数：`--jobs 2`
2. 分批处理大文件
3. 增加系统内存

### 问题 5: 识别准确率低

**优化建议**:
1. 检查扫描质量（建议 300 DPI）
2. 启用图像增强：`--clean`
3. 调整 OCR 语言设置
4. 使用更新的 Tesseract 版本

## 高级功能

### 自定义 OCR 参数

编辑 `server/src/services/ocrService.ts`:

```typescript
private buildOCRCommand(
  inputPath: string,
  outputPath: string,
  options: OCROptions
): string {
  const args: string[] = ['ocrmypdf'];

  // 添加自定义参数
  args.push('--pdfa-image-compression', 'jpeg');  // 图像压缩
  args.push('--oversample', '300');               // DPI 设置
  args.push('--remove-background');               // 移除背景

  // ... 其他配置
}
```

### 多语言混合识别

对于包含多种语言的文档：

```env
# 英文 + 中文 + 日文
OCR_LANGUAGE=eng+chi_sim+jpn

# 英文 + 德文 + 法文
OCR_LANGUAGE=eng+deu+fra
```

### OCR 质量控制

监控 OCR 质量：

```typescript
// 检查识别的文本数量
if (segments.length < 10 && ocrProcessed) {
  console.warn('OCR produced very few text segments, check quality');
}
```

## API 参考

### POST /api/pdfs/:id/index

索引 PDF 并可选启用 OCR。

**请求体**:
```json
{
  "enableOCR": true
}
```

**响应**:
```json
{
  "success": true,
  "message": "PDF indexed successfully",
  "segmentCount": 1234,
  "ocrProcessed": true
}
```

## 相关资源

- [OCRmyPDF 官方文档](https://ocrmypdf.readthedocs.io/)
- [Tesseract OCR 文档](https://tesseract-ocr.github.io/)
- [PDF.js 文档](https://mozilla.github.io/pdf.js/)

## 常见问题

**Q: OCR 是否会修改原始 PDF？**
A: 不会。系统会生成新的临时文件，原始文件保持不变。

**Q: 处理一个 PDF 需要多长时间？**
A: 取决于页数和图像质量，通常每页 2-5 秒。

**Q: 是否支持批量 OCR？**
A: 支持，可以使用 `ocrService.batchPreprocessPDFs()` 方法。

**Q: OCR 后的文件是否会更大？**
A: 可能会稍大，因为添加了文本层。可以使用 `--optimize` 参数压缩。

## 技术支持

如有问题，请提交 Issue 或查看日志：

```bash
# 查看后端日志
cd server
npm run dev

# OCR 日志会显示详细处理信息
```

---

**更新日期**: 2025-10-14
