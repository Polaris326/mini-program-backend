/**
 * 创作者备份箱 - 后端服务入口
 * 
 * 这是一个示例实现，用于演示API的工作方式
 * 实际部署时需要配置真实的后端服务器
 */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const parseRoutes = require('./routes/parse');
const historyRoutes = require('./routes/history');
const logger = require('./middleware/logger');

// 加载环境变量
dotenv.config();

// 创建Express应用
const app = express();
const PORT = process.env.PORT || 80;

// 中间件配置
app.use(cors({
  origin: '*', // 生产环境应配置具体域名
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 请求解析
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 请求日志
app.use(logger);

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    code: 0,
    message: '服务正常运行',
    timestamp: Date.now()
  });
});

// API路由
app.use('/api/v1/parse', parseRoutes);
app.use('/api/v1/history', historyRoutes);

// 404处理
app.use((req, res) => {
  res.status(404).json({
    code: 404,
    message: '请求的接口不存在'
  });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({
    code: 5001,
    message: '服务器内部错误，请稍后重试'
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║                                            ║
║   创作者备份箱 - 后端服务                    ║
║   Creative Vault Backend Service            ║
║                                            ║
║   服务端口: ${PORT}                           ║
║   健康检查: http://localhost:${PORT}/health  ║
║                                            ║
║   API端点:                                  ║
║   POST /api/v1/parse - 解析作品链接          ║
║   GET  /api/v1/history - 获取历史记录        ║
║                                            ║
╚════════════════════════════════════════════╝
  `);
});

module.exports = app;
