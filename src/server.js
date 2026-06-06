require('dotenv').config();
const config = require('./config');
const { createServer } = require('./app');

const startServer = async () => {
  try {
    const server = await createServer();

    server.listen(config.port, () => {
      console.log(`\n============================================`);
      console.log(`🚀 智慧城市供水管网系统后端已启动`);
      console.log(`📍 服务地址: http://localhost:${config.port}`);
      console.log(`📡 API 前缀: http://localhost:${config.port}/api`);
      console.log(`🔌 WebSocket: ws://localhost:${config.port}`);
      console.log(`📋 健康检查: http://localhost:${config.port}/api/health`);
      console.log(`============================================\n`);
    });
  } catch (error) {
    console.error('服务器启动失败:', error);
    process.exit(1);
  }
};

startServer();
