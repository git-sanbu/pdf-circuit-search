import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import pdfRoutes from './routes/pdfRoutes.js';
import searchRoutes from './routes/searchRoutes.js';
import llmRoutes from './routes/llmRoutes.js';
import { initializePDFs } from './utils/initialize.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false
}));
app.use(express.json());

// 请求日志
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// 路由
app.use('/api', pdfRoutes);
app.use('/api', searchRoutes);
app.use('/api', llmRoutes);

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 错误处理
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// 启动服务器
app.listen(PORT, async () => {
  console.log('='.repeat(50));
  console.log(`🚀 PDF Search Server running on http://localhost:${PORT}`);
  console.log('='.repeat(50));

  // 初始化PDF列表和 OCR
  console.log('\n📚 Initializing system...');
  await initializePDFs();
  console.log('\n✅ Server ready!\n');
});
