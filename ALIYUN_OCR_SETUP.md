# 阿里云 OCR 集成说明

本项目已集成阿里云 OCR SDK，用于 PDF 文档的 OCR 预处理，以便后续进行关键词搜索。

## 功能特点

- ✅ 使用阿里云 OCR API 进行 PDF 文本识别
- ✅ 支持中英文混合识别
- ✅ 自动处理多页 PDF
- ✅ 提取文本用于搜索和查询
- ✅ 支持切换 OCR 提供商（阿里云/OCRmyPDF）

## 安装依赖

阿里云 OCR SDK 依赖已安装：

```bash
cd server
npm install
```

已安装的包：
- `@alicloud/ocr-api20210707` - 阿里云 OCR API SDK
- `@alicloud/openapi-client` - 阿里云 OpenAPI 客户端
- `@alicloud/tea-util` - 阿里云工具库

## 配置说明

### 1. 获取阿里云访问凭证

1. 登录[阿里云控制台](https://ram.console.aliyun.com/manage/ak)
2. 创建 AccessKey ID 和 AccessKey Secret
3. 确保账号已开通 OCR 服务

### 2. 配置环境变量

编辑 `server/.env` 文件，添加以下配置：

```bash
# OCR 配置
ENABLE_OCR=true
OCR_PROVIDER=aliyun

# 阿里云 OCR 配置
ALIYUN_ACCESS_KEY_ID=your-access-key-id
ALIYUN_ACCESS_KEY_SECRET=your-access-key-secret
ALIYUN_OCR_ENDPOINT=ocr-api.cn-hangzhou.aliyuncs.com
```

**重要：** 请将 `your-access-key-id` 和 `your-access-key-secret` 替换为你的真实凭证。

### 3. OCR 提供商选择

你可以选择使用不同的 OCR 提供商：

- `aliyun` - 阿里云 OCR（推荐，云端识别，准确率高）
- `ocrmypdf` - 本地 OCRmyPDF（需要安装 ocrmypdf 命令行工具）

在 `.env` 文件中设置：

```bash
OCR_PROVIDER=aliyun  # 或 ocrmypdf
```

## 使用方法

### 测试 OCR 功能

运行测试脚本验证配置是否正确：

```bash
cd server
npm run tsx test-aliyun-ocr.ts
```

测试脚本会：
1. 检查阿里云凭证配置
2. 查找 `pdfs` 目录下的 PDF 文件
3. 对第一个 PDF 执行 OCR 识别
4. 显示识别结果
5. 将完整结果保存为 `.txt` 文件

### 在代码中使用

#### 方法 1: 使用 OCRService（推荐）

```typescript
import { ocrService } from './services/ocrService';

// 预处理 PDF（会根据环境变量选择提供商）
const processedPath = await ocrService.preprocessPDF(
  '/path/to/input.pdf',
  '/path/to/output.pdf',
  {
    enabled: true,
    provider: 'aliyun', // 可选，覆盖默认配置
  }
);
```

#### 方法 2: 直接使用阿里云 OCR Service

```typescript
import { aliyunOCRService } from './services/aliyunOCRService';

// 识别 PDF
const result = await aliyunOCRService.recognizePDF('/path/to/file.pdf');

if (result.success) {
  console.log('识别文本:', result.text);
  console.log('置信度:', result.confidence);

  // 保存结果
  await aliyunOCRService.saveResultToFile(result, '/path/to/output.txt');
}

// 批量识别
const results = await aliyunOCRService.batchRecognizePDFs([
  '/path/to/file1.pdf',
  '/path/to/file2.pdf',
]);
```

## API 说明

### AliyunOCRService

#### `recognizePDF(pdfPath: string): Promise<OCRResult>`
识别本地 PDF 文件。

**参数：**
- `pdfPath` - PDF 文件的绝对路径

**返回：**
- `OCRResult` - 包含识别结果的对象

#### `recognizePDFFromURL(pdfUrl: string): Promise<OCRResult>`
识别远程 PDF 文件（通过 URL）。

**参数：**
- `pdfUrl` - PDF 文件的 URL

**返回：**
- `OCRResult` - 包含识别结果的对象

#### `batchRecognizePDFs(pdfPaths: string[]): Promise<Map<string, OCRResult>>`
批量识别多个 PDF 文件。

**参数：**
- `pdfPaths` - PDF 文件路径数组

**返回：**
- `Map<string, OCRResult>` - 文件路径到识别结果的映射

### OCRResult 结构

```typescript
interface OCRResult {
  success: boolean;      // 是否识别成功
  text: string;          // 识别的完整文本
  confidence?: number;   // 置信度 (0-1)
  error?: string;        // 错误信息（如果失败）
  pages?: PageOCRResult[]; // 分页结果
}
```

## 工作流程

当启用阿里云 OCR 时，PDF 处理流程如下：

1. **上传 PDF** → 文件保存到 `pdfs` 目录
2. **OCR 识别** → 调用阿里云 OCR API 识别文本
3. **文本保存** → 识别的文本保存为 `.txt` 文件
4. **文本解析** → 使用 pdf.js 解析 PDF 结构
5. **向量化** → 文本分块并生成向量
6. **存储** → 保存到数据库用于搜索

## 注意事项

1. **费用：** 阿里云 OCR 是付费服务，请注意用量和费用
2. **限制：** API 有调用频率和文件大小限制，详见阿里云文档
3. **安全：** 不要将 AccessKey 提交到代码仓库
4. **网络：** 需要能够访问阿里云 API（`ocr-api.cn-hangzhou.aliyuncs.com`）
5. **文本层：** 阿里云 OCR 只返回文本，不会生成带 OCR 层的 PDF

## 文件说明

- `src/services/aliyunOCRService.ts` - 阿里云 OCR 服务类
- `src/services/ocrService.ts` - 统一的 OCR 服务（支持多提供商）
- `test-aliyun-ocr.ts` - OCR 功能测试脚本
- `.env.example` - 环境变量配置示例

## 故障排除

### 问题：识别失败，提示凭证错误

**解决：**
1. 检查 `.env` 文件中的 AccessKey 是否正确
2. 确认阿里云账号已开通 OCR 服务
3. 检查 AccessKey 是否有 OCR API 权限

### 问题：识别速度慢

**解决：**
1. 阿里云 OCR 是云端服务，速度取决于网络和文件大小
2. 对于大文件，考虑使用批量处理
3. 可以切换到本地 OCRmyPDF（设置 `OCR_PROVIDER=ocrmypdf`）

### 问题：无法识别某些 PDF

**解决：**
1. 确保 PDF 文件格式正确
2. 检查 PDF 是否包含图像（纯文本 PDF 不需要 OCR）
3. 尝试使用其他 OCR 工具对比结果

## 相关链接

- [阿里云 OCR API 文档](https://help.aliyun.com/document_detail/442261.html)
- [阿里云 OCR SDK (TypeScript)](https://api.aliyun.com/api-tools/sdk/ocr-api)
- [阿里云 RAM 访问控制](https://ram.console.aliyun.com/)

## 技术支持

如有问题，请参考：
1. 阿里云 OCR 官方文档
2. 项目 GitHub Issues
3. 阿里云工单系统
