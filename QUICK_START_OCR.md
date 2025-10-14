# OCR 功能快速开始 🚀

## 一分钟上手

### 1. 安装 OCRmyPDF

**Ubuntu/Debian/WSL:**
```bash
sudo apt update && sudo apt install -y ocrmypdf tesseract-ocr-chi-sim
```

**macOS:**
```bash
brew install ocrmypdf tesseract-lang
```

### 2. 验证安装

```bash
ocrmypdf --version
tesseract --list-langs
```

应该看到 `eng` 和 `chi_sim`。

### 3. 配置系统

编辑 `server/.env`，确认已启用：
```env
ENABLE_OCR=true
OCR_LANGUAGE=eng+chi_sim
```

### 4. 测试运行

```bash
cd server
npx tsx test-ocr.ts
```

### 5. 开始使用

```bash
# 启动服务
npm run dev

# 在前端点击"立即索引"
# 系统会自动对扫描版 PDF 进行 OCR！
```

## 常用命令

### 手动 OCR 单个文件
```bash
ocrmypdf --deskew --rotate-pages --skip-text \
  -l eng+chi_sim \
  input.pdf output.pdf
```

### 批量处理
```bash
for f in pdfs/*.pdf; do
  ocrmypdf --skip-text -l eng+chi_sim "$f" "${f%.pdf}_ocr.pdf"
done
```

## 配置速查

| 参数 | 作用 | 推荐值 |
|------|------|--------|
| `-l` | 语言 | `eng+chi_sim` |
| `--deskew` | 去倾斜 | ✅ |
| `--rotate-pages` | 自动旋转 | ✅ |
| `--skip-text` | 跳过已有文本 | ✅ |
| `--jobs` | 并发数 | `4` |

## 故障速查

**问题**: `ocrmypdf: command not found`
**解决**: `sudo apt install ocrmypdf`

**问题**: 语言包缺失
**解决**: `sudo apt install tesseract-ocr-chi-sim`

**问题**: 处理太慢
**解决**: 增加 `--jobs 8` 参数

## 更多信息

📖 详细文档: [OCR_SETUP.md](./OCR_SETUP.md)
📊 集成说明: [OCR_INTEGRATION_SUMMARY.md](./OCR_INTEGRATION_SUMMARY.md)

---
**需要帮助？** 查看完整文档或提交 Issue
