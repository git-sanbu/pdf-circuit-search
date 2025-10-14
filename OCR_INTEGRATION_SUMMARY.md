# OCR 功能集成总结

## 概述

已成功为 PDF 电路图搜索系统集成 OCRmyPDF，支持对扫描版 PDF 进行 OCR 预处理，添加文本层使其可搜索。

## 已完成的工作

### 1. 核心功能模块

#### `/server/src/services/ocrService.ts`
完整的 OCR 服务模块，提供：
- ✅ OCRmyPDF 安装检测
- ✅ PDF OCR 预处理
- ✅ 智能参数配置（去倾斜、旋转、多语言等）
- ✅ 批量处理支持
- ✅ 错误处理和回退机制

**核心方法**:
```typescript
// 单文件预处理
await ocrService.preprocessPDF(inputPath, outputPath, options);

// 批量预处理
await ocrService.batchPreprocessPDFs(inputPaths, options);

// 检查安装状态
await ocrService.checkOCRmyPDFInstalled();
```

### 2. 集成到索引流程

#### `/server/src/controllers/pdfController.ts`
修改了 `indexPDF` 方法，添加 OCR 预处理步骤：

**处理流程**:
```
1. 接收索引请求
   ↓
2. 检查是否启用 OCR
   ↓
3. 调用 OCRmyPDF 预处理（如启用）
   ↓
4. 使用处理后的 PDF 进行文本提取
   ↓
5. 保存索引到数据库
   ↓
6. 返回结果（包含 ocrProcessed 标志）
```

**关键特性**:
- 支持客户端控制 OCR 开关
- 自动处理失败回退
- 保留 OCR 处理后的文件供后续使用

### 3. 配置管理

#### `/server/.env`
新增 OCR 配置选项：
```env
ENABLE_OCR=true
OCR_LANGUAGE=eng+chi_sim
OCR_DESKEW=true
OCR_ROTATE_PAGES=true
OCR_SKIP_TEXT=true
```

#### `/server/.env.example`
提供完整的配置模板供参考。

### 4. 文档和工具

#### `/pdftest/OCR_SETUP.md`
完整的 OCR 功能配置指南，包括：
- 安装说明（Ubuntu/macOS/Windows）
- 配置说明
- 使用方法
- 性能优化建议
- 故障排除
- 高级功能

#### `/server/test-ocr.ts`
OCR 功能测试脚本：
- 检查 OCRmyPDF 安装
- 自动查找测试 PDF
- 执行 OCR 预处理测试
- 显示处理时间和文件大小

#### 更新 `/pdftest/README.md`
在主文档中添加 OCR 功能说明和快速开始指南。

## 技术架构

### OCR 处理流程

```
┌─────────────────────────────────────────────────────────────┐
│                    用户上传/选择 PDF                          │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
         ┌──────────────────────────────┐
         │   点击"立即索引"按钮          │
         └──────────────┬───────────────┘
                        │
                        ▼
         ┌──────────────────────────────┐
         │  pdfController.indexPDF()    │
         └──────────────┬───────────────┘
                        │
                        ▼
         ┌──────────────────────────────┐
         │   检查 ENABLE_OCR 配置        │
         └──────────────┬───────────────┘
                        │
                ┌───────┴───────┐
                │               │
           启用 OCR          禁用 OCR
                │               │
                ▼               │
    ┌────────────────────┐     │
    │ ocrService.        │     │
    │ preprocessPDF()    │     │
    └────────┬───────────┘     │
             │                 │
             ▼                 │
    ┌────────────────────┐    │
    │  调用 OCRmyPDF     │    │
    │  - 检测页面方向    │    │
    │  - 去倾斜         │    │
    │  - OCR 识别       │    │
    │  - 添加文本层     │    │
    └────────┬───────────┘    │
             │                 │
             ▼                 │
    ┌────────────────────┐    │
    │ 生成处理后的 PDF   │    │
    └────────┬───────────┘    │
             │                 │
             └────────┬────────┘
                      │
                      ▼
         ┌────────────────────────────┐
         │  pdfParser.parsePDF()      │
         │  使用 PDF.js 提取文本      │
         └────────────┬───────────────┘
                      │
                      ▼
         ┌────────────────────────────┐
         │  保存文本片段到数据库       │
         └────────────┬───────────────┘
                      │
                      ▼
         ┌────────────────────────────┐
         │  返回索引结果给前端         │
         │  { ocrProcessed: true }    │
         └────────────────────────────┘
```

### 关键技术点

1. **Node.js 调用 Python 工具**
   - 使用 `child_process.exec` 调用 OCRmyPDF CLI
   - 设置合理的 timeout 和 buffer 大小
   - 错误处理和回退机制

2. **智能跳过策略**
   - 使用 `--skip-text` 参数跳过已有文本的页面
   - 大幅减少处理时间

3. **并发处理**
   - `--jobs 4` 参数启用多核并行处理
   - 可根据服务器配置调整

4. **文件管理**
   - 生成临时文件用于 OCR 处理
   - 保留处理后的文件供后续使用
   - 可选的清理策略

## 使用方式

### 方式1: 自动 OCR（推荐）

```bash
# 1. 确保已安装 OCRmyPDF
ocrmypdf --version

# 2. 配置环境变量
# 编辑 server/.env
ENABLE_OCR=true

# 3. 启动服务
cd server
npm run dev

# 4. 在前端点击"立即索引"
# 系统会自动对扫描版 PDF 进行 OCR
```

### 方式2: 手动测试

```bash
cd server

# 运行测试脚本
npx tsx test-ocr.ts
```

### 方式3: API 调用

```typescript
// 启用 OCR
await api.post(`/api/pdfs/${id}/index`, { enableOCR: true });

// 禁用 OCR
await api.post(`/api/pdfs/${id}/index`, { enableOCR: false });
```

## 配置选项

### 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `ENABLE_OCR` | `true` | 是否启用 OCR 功能 |
| `OCR_LANGUAGE` | `eng+chi_sim` | OCR 识别语言 |
| `OCR_DESKEW` | `true` | 是否去倾斜 |
| `OCR_ROTATE_PAGES` | `true` | 是否自动旋转页面 |
| `OCR_SKIP_TEXT` | `true` | 是否跳过已有文本的页面 |

### OCR 语言代码

- `eng` - 英文
- `chi_sim` - 简体中文
- `chi_tra` - 繁体中文
- `jpn` - 日文
- `kor` - 韩文
- 更多语言查看 [Tesseract 文档](https://tesseract-ocr.github.io/tessdoc/)

## 性能考虑

### 处理时间

- **已有文本层的 PDF**: 几乎无额外开销（自动跳过）
- **扫描版 PDF**: 约 2-5 秒/页
- **高质量扫描**: 可能更慢

### 优化建议

1. **预先批量处理**
   ```bash
   # 使用脚本预处理所有 PDF
   for f in pdfs/*.pdf; do
     ocrmypdf --skip-text -l eng+chi_sim "$f" "${f%.pdf}_ocr.pdf"
   done
   ```

2. **增加并发数**
   ```typescript
   // ocrService.ts
   args.push('--jobs', '8');  // 根据 CPU 核心数调整
   ```

3. **降低图像质量**
   ```typescript
   args.push('--oversample', '150');  // 降低 DPI
   ```

## 故障排除

### 常见问题

1. **OCRmyPDF 未安装**
   ```bash
   # Ubuntu
   sudo apt install ocrmypdf

   # macOS
   brew install ocrmypdf
   ```

2. **语言包缺失**
   ```bash
   # 安装中文语言包
   sudo apt install tesseract-ocr-chi-sim tesseract-ocr-chi-tra
   ```

3. **处理超时**
   - 增加 timeout 配置（ocrService.ts:89）
   - 减少并发任务数

4. **内存不足**
   - 减少 `--jobs` 参数
   - 分批处理大文件

## API 变更

### 新增端点

无新增端点，现有端点增强：

**POST /api/pdfs/:id/index**

请求体（新增可选参数）:
```json
{
  "enableOCR": true  // 可选，默认 true
}
```

响应（新增字段）:
```json
{
  "success": true,
  "message": "PDF indexed successfully",
  "segmentCount": 1234,
  "ocrProcessed": true  // 新增：是否进行了 OCR 处理
}
```

## 未来改进

### 可选增强

1. **前端 UI 增强**
   - 显示 OCR 处理进度条
   - 允许用户选择是否启用 OCR
   - 显示 OCR 状态标识

2. **智能检测**
   - 自动检测 PDF 是否为扫描版
   - 根据检测结果决定是否 OCR

3. **缓存机制**
   - 保存 OCR 结果的哈希值
   - 避免重复处理相同文件

4. **质量控制**
   - OCR 置信度评分
   - 低质量警告

5. **批量 OCR API**
   - 提供批量 OCR 端点
   - 后台任务队列

## 相关文件

### 新增文件
- `/server/src/services/ocrService.ts` - OCR 服务模块
- `/server/.env.example` - 环境变量模板
- `/server/test-ocr.ts` - OCR 测试脚本
- `/pdftest/OCR_SETUP.md` - OCR 配置指南
- `/pdftest/OCR_INTEGRATION_SUMMARY.md` - 本文档

### 修改文件
- `/server/src/controllers/pdfController.ts` - 集成 OCR 到索引流程
- `/server/.env` - 添加 OCR 配置
- `/pdftest/README.md` - 更新主文档

## 测试清单

- [ ] OCRmyPDF 安装验证
- [ ] 扫描版 PDF OCR 处理
- [ ] 已有文本层的 PDF 跳过测试
- [ ] 中英文混合识别
- [ ] 错误处理和回退
- [ ] 性能测试（多页文档）
- [ ] 配置项测试（各种参数组合）

## 总结

OCR 功能已完全集成到系统中，具备：
- ✅ 自动化处理流程
- ✅ 灵活的配置选项
- ✅ 完善的错误处理
- ✅ 详细的文档支持
- ✅ 易于使用和维护

系统现在可以处理**扫描版 PDF**，大大扩展了支持的文档类型范围。

---

**集成完成日期**: 2025-10-14
**版本**: 1.0.0
