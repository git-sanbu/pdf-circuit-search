# 阿里云 OCR 集成状态

## 当前状态

✅ **已完成：**
1. 安装阿里云 OCR SDK 依赖包（`@alicloud/ocr-api20210707`）
2. 创建 PDF 转图片服务（`pdfToImageService.ts`）- **完全工作**
3. 创建阿里云 OCR 服务框架（`aliyunOCRService.ts`）
4. 配置环境变量支持

⚠️ **当前问题：**
- 阿里云 OCR SDK 在 ESM (ES Module) 环境中的导入和使用存在兼容性问题
- SDK 设计为 CommonJS 模块，在项目的 ESM 环境中需要特殊处理
- API 调用格式需要进一步调试

## 工作方案

### 方案 1: 继续使用 OCRmyPDF（推荐）

**优点：**
- 已经集成且工作正常
- 本地处理，无需网络请求
- 免费，无调用限制
- 直接生成带 OCR 层的 PDF

**缺点：**
- 需要系统安装 ocrmypdf 和 tesseract
- 处理速度较慢
- 需要本地计算资源

**使用方式：**
```bash
# 安装 OCRmyPDF
# Ubuntu/Debian:
sudo apt-get install ocrmypdf tesseract-ocr tesseract-ocr-chi-sim

# 配置 .env
OCR_PROVIDER=ocrmypdf
ENABLE_OCR=true
```

### 方案 2: 使用 PDF 转图片 + 其他 OCR 服务

由于已经实现了完整的 PDF 转图片功能，可以：

**选项 A: 使用百度 OCR**
- npm 包：`@baiducloud/sdk`
- 有免费额度
- 文档完善，ESM 兼容性好

**选项 B: 使用腾讯云 OCR**
- npm 包：`tencentcloud-sdk-nodejs`
- 有免费额度
- SDK 质量较高

**选项 C: 使用 Tesseract.js**
- npm 包：`tesseract.js`
- 完全免费
- 纯 JavaScript，无需系统依赖
- 可在浏览器和 Node.js 中运行

### 方案 3: 继续修复阿里云 OCR SDK

需要：
1. 研究 SDK 在 ESM 环境中的正确使用方式
2. 可能需要创建 CommonJS 包装器
3. 或将项目改为 CommonJS (`"type": "commonjs"`)

## 已实现的功能

### 1. PDF 转图片服务 ✅

文件：`server/src/services/pdfToImageService.ts`

```typescript
import { pdfToImageService } from './services/pdfToImageService';

// 转换整个 PDF
const images = await pdfToImageService.convertPdfToImages(
  '/path/to/file.pdf',
  '/output/directory',
  { scale: 2.0, format: 'png' }
);

// 转换单页
const image = await pdfToImageService.convertPageToImage(
  '/path/to/file.pdf',
  1, // 页码
  '/output/image.png'
);
```

**特点：**
- 支持多页 PDF
- 可配置缩放比例和格式（PNG/JPEG）
- 使用 pdf.js 和 canvas 进行渲染
- 完全工作，已测试

### 2. OCR 服务统一接口 ✅

文件：`server/src/services/ocrService.ts`

支持通过配置切换 OCR 提供商：

```typescript
import { ocrService } from './services/ocrService';

// 预处理 PDF
const result = await ocrService.preprocessPDF(
  '/path/to/input.pdf',
  '/path/to/output.pdf',
  {
    enabled: true,
    provider: 'ocrmypdf', // 或 'aliyun'
  }
);
```

## 推荐方案：Tesseract.js

基于当前项目的 ESM 结构和需求，推荐使用 Tesseract.js：

### 安装

```bash
npm install tesseract.js
```

### 实现示例

```typescript
import Tesseract from 'tesseract.js';
import { pdfToImageService } from './pdfToImageService';

async function recognizePDF(pdfPath: string) {
  // 1. 转换 PDF 为图片
  const images = await pdfToImageService.convertPdfToImages(pdfPath);

  // 2. 初始化 Tesseract
  const worker = await Tesseract.createWorker('chi_sim+eng');

  // 3. 逐页识别
  const results = [];
  for (const image of images) {
    const { data } = await worker.recognize(image.imagePath);
    results.push(data.text);
  }

  // 4. 清理
  await worker.terminate();
  await pdfToImageService.cleanupImages(images);

  return results.join('\n\n');
}
```

**优点：**
- ✅ 完全免费
- ✅ 无需外部依赖
- ✅ ESM 兼容
- ✅ 支持中英文
- ✅ 可离线使用
- ✅ 与现有代码完美集成

## 下一步建议

1. **短期**：使用 OCRmyPDF（如果系统允许安装）
2. **中期**：集成 Tesseract.js 作为纯 JavaScript 方案
3. **长期**：如果需要云端 OCR，考虑腾讯云或百度 OCR

## 文件说明

- `src/services/aliyunOCRService.ts` - 阿里云 OCR 服务（需要修复）
- `src/services/pdfToImageService.ts` - PDF 转图片服务（✅ 工作正常）
- `src/services/ocrService.ts` - OCR 统一服务接口
- `test-aliyun-ocr.ts` - OCR 测试脚本
- `.env.example` - 环境变量配置示例

## 测试

PDF 转图片功能已测试成功：
- ✅ 14 页 PDF 成功转换为 14 张 PNG 图片
- ✅ 图片质量良好，适合 OCR 识别
- ✅ 自动清理临时文件

## 总结

虽然阿里云 OCR SDK 集成遇到技术问题，但：
1. **PDF 转图片功能完全可用** - 这是 OCR 的关键前置步骤
2. **有多种替代方案** - OCRmyPDF、Tesseract.js、其他云服务
3. **系统架构灵活** - 可以轻松切换 OCR 提供商

**建议：暂时使用 OCRmyPDF 或 Tesseract.js，它们与当前代码结构完美兼容。**
