# API 使用示例

## 快速测试

### 1. 启动服务器

```bash
cd server
npm run dev
```

等待初始化完成，看到：
```
✓ OCR initialization complete:
  - Total PDFs: X
  - Newly processed: X
  - Using cache: X

✅ Server ready!
```

### 2. 获取 PDF 列表

```bash
curl http://localhost:3000/api/pdfs
```

**响应示例**：
```json
{
  "success": true,
  "data": [
    {
      "id": "abc-123-def",
      "filename": "document.pdf",
      "title": "document",
      "pageCount": 14,
      "ocrProcessed": true,
      "ocrProcessedAt": "2025-10-14T04:00:00.000Z"
    }
  ]
}
```

记录 `id` 用于后续搜索。

### 3. OCR 搜索（新功能）

```bash
curl -X POST http://localhost:3000/api/search/ocr \
  -H "Content-Type: application/json" \
  -d '{
    "pdfId": "abc-123-def",
    "keyword": "关键词"
  }'
```

**响应示例**：
```json
{
  "success": true,
  "data": {
    "pdfId": "abc-123-def",
    "keyword": "关键词",
    "totalPages": 2,
    "totalMatches": 3,
    "results": [
      {
        "pageNumber": 1,
        "matches": [
          {
            "text": "这是包含关键词的文本块",
            "bbox": [50, 100, 400, 30],
            "confidence": 0.95
          }
        ]
      },
      {
        "pageNumber": 5,
        "matches": [
          {
            "text": "另一个包含关键词的段落",
            "bbox": [50, 200, 380, 28],
            "confidence": 0.92
          },
          {
            "text": "第二个匹配的关键词文本",
            "bbox": [50, 300, 420, 32],
            "confidence": 0.93
          }
        ]
      }
    ]
  }
}
```

**bbox 格式**：`[x, y, width, height]`
- `x`: 文本块左上角 X 坐标
- `y`: 文本块左上角 Y 坐标
- `width`: 文本块宽度
- `height`: 文本块高度

### 4. 传统文本搜索

```bash
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "pdfId": "abc-123-def",
    "keyword": "搜索词"
  }'
```

## JavaScript 示例

### 完整搜索 + 高亮流程

```javascript
async function searchAndHighlight(pdfId, keyword) {
  // 1. 执行 OCR 搜索
  const response = await fetch('http://localhost:3000/api/search/ocr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pdfId, keyword })
  });

  const result = await response.json();

  if (!result.success) {
    console.error('Search failed:', result.error);
    return;
  }

  console.log(`Found ${result.data.totalMatches} matches in ${result.data.totalPages} pages`);

  // 2. 遍历每页结果
  result.data.results.forEach(pageResult => {
    const pageNumber = pageResult.pageNumber;

    console.log(`\n📄 Page ${pageNumber}:`);

    // 3. 遍历该页的文本块
    pageResult.matches.forEach((match, index) => {
      console.log(`  Match ${index + 1}:`);
      console.log(`    Text: "${match.text}"`);
      console.log(`    Position: (${match.bbox[0]}, ${match.bbox[1]})`);
      console.log(`    Size: ${match.bbox[2]}x${match.bbox[3]}`);
      console.log(`    Confidence: ${(match.confidence * 100).toFixed(1)}%`);

      // 4. 在 PDF 上高亮（假设使用 PDF.js）
      highlightBox(pageNumber, match.bbox);
    });
  });
}

function highlightBox(pageNumber, bbox) {
  const [x, y, width, height] = bbox;

  // 创建高亮元素
  const highlight = document.createElement('div');
  highlight.className = 'pdf-highlight';
  highlight.style.cssText = `
    position: absolute;
    left: ${x}px;
    top: ${y}px;
    width: ${width}px;
    height: ${height}px;
    background-color: rgba(255, 255, 0, 0.3);
    border: 2px solid rgba(255, 200, 0, 0.8);
    pointer-events: none;
    z-index: 10;
  `;

  // 添加到对应页面的容器
  const pageContainer = document.querySelector(`#page-${pageNumber}`);
  if (pageContainer) {
    pageContainer.appendChild(highlight);
  }
}
```

### React 组件示例

```jsx
import { useState, useEffect } from 'react';

function PDFSearchHighlight({ pdfId }) {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!keyword.trim()) return;

    setLoading(true);

    try {
      const response = await fetch('http://localhost:3000/api/search/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfId, keyword })
      });

      const data = await response.json();

      if (data.success) {
        setResults(data.data);
      } else {
        console.error('Search failed:', data.error);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="search-box">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="输入关键词搜索..."
        />
        <button onClick={handleSearch} disabled={loading}>
          {loading ? '搜索中...' : '搜索'}
        </button>
      </div>

      {results && (
        <div className="search-results">
          <h3>找到 {results.totalMatches} 处匹配（{results.totalPages} 页）</h3>

          {results.results.map(pageResult => (
            <div key={pageResult.pageNumber} className="page-result">
              <h4>第 {pageResult.pageNumber} 页</h4>
              {pageResult.matches.map((match, idx) => (
                <div key={idx} className="match-item">
                  <p>{match.text}</p>
                  <small>
                    位置: ({match.bbox[0]}, {match.bbox[1]})
                    | 置信度: {(match.confidence * 100).toFixed(1)}%
                  </small>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

## 数据库直接查询

### 查看 OCR 状态

```bash
sqlite3 server/data/app.db

-- 查看所有 PDF 的 OCR 状态
SELECT id, filename, ocrProcessed, ocrProcessedAt
FROM pdfs
ORDER BY uploadedAt DESC;

-- 查看特定 PDF 的 OCR 结果
SELECT pageNumber, LENGTH(ocrText) as textLength, confidence
FROM ocr_results
WHERE pdfId = 'abc-123-def'
ORDER BY pageNumber;

-- 统计信息
SELECT
  COUNT(*) as totalPDFs,
  SUM(CASE WHEN ocrProcessed = 1 THEN 1 ELSE 0 END) as processedPDFs,
  SUM(CASE WHEN ocrProcessed = 0 THEN 1 ELSE 0 END) as unprocessedPDFs
FROM pdfs;
```

## 错误处理

### 错误1：PDF 未处理

```bash
curl -X POST http://localhost:3000/api/search/ocr \
  -H "Content-Type: application/json" \
  -d '{"pdfId": "xxx", "keyword": "test"}'
```

**响应**：
```json
{
  "success": false,
  "error": "PDF has not been OCR processed. Please process it first."
}
```

**解决**：
1. 等待系统启动完成 OCR 初始化
2. 或手动触发 OCR 处理（如果实现了手动触发 API）

### 错误2：PDF 不存在

```json
{
  "success": false,
  "error": "PDF not found"
}
```

**解决**：检查 `pdfId` 是否正确

## 性能测试

### 测试首次启动（无缓存）

```bash
time npm run dev
```

观察日志中的 "Newly processed" 数量。

### 测试二次启动（有缓存）

```bash
# 停止服务器后重启
time npm run dev
```

观察日志中的 "Using cache" 数量，应该显著提高。

### 测试搜索性能

```bash
time curl -X POST http://localhost:3000/api/search/ocr \
  -H "Content-Type: application/json" \
  -d '{"pdfId": "abc-123-def", "keyword": "test"}'
```

## 常见场景

### 场景1：新增 PDF

1. 将 PDF 文件放入 `server/pdfs/` 目录
2. 重启服务器
3. 系统自动：
   - 检测新文件
   - 解析文本
   - 执行 OCR
   - 保存结果

### 场景2：更新 PDF

1. 替换 `server/pdfs/` 中的同名文件
2. 重启服务器
3. 系统自动：
   - 计算新哈希
   - 检测变更
   - 重新 OCR
   - 更新缓存

### 场景3：批量搜索

```javascript
async function batchSearch(pdfId, keywords) {
  const results = {};

  for (const keyword of keywords) {
    const response = await fetch('http://localhost:3000/api/search/ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pdfId, keyword })
    });

    const data = await response.json();
    results[keyword] = data.data;
  }

  return results;
}

// 使用
const searchResults = await batchSearch('abc-123', ['关键词1', '关键词2', '关键词3']);
```

## 调试技巧

### 1. 查看详细日志

```bash
# 启动时查看完整日志
npm run dev 2>&1 | tee startup.log
```

### 2. 检查文件哈希

```javascript
// 在 Node.js 中计算哈希
const crypto = require('crypto');
const fs = require('fs');

function calculateHash(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', data => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

calculateHash('./pdfs/document.pdf').then(console.log);
```

### 3. 清除缓存（强制重新 OCR）

```bash
# 删除数据库
rm server/data/app.db

# 重启服务器
npm run dev
```

## 总结

**核心 API**：
- `GET /api/pdfs` - 获取 PDF 列表
- `POST /api/search/ocr` - OCR 搜索（带位置）
- `POST /api/search` - 传统文本搜索

**响应格式**：
- 包含 `pageNumber`、`text`、`bbox`、`confidence`
- `bbox` 格式：`[x, y, width, height]`
- 可直接用于前端高亮显示

**使用流程**：
1. 启动服务器 → 自动 OCR
2. 获取 PDF ID
3. 搜索关键词
4. 解析 bbox 坐标
5. 在前端高亮显示
