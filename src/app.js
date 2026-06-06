const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');
const { Server } = require('socket.io');

const connectDB = require('./config/database');
const routes = require('./routes');
const { initWebSocket, getWebSocket } = require('./services/webSocketService');
const { verifyToken } = require('./utils/helpers');
const { initScheduledTasks } = require('./cron');

const createApp = () => {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(morgan('dev'));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.use('/api', routes);

  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
      success: false,
      message: err.message || '服务器内部错误'
    });
  });

  app.use((req, res) => {
    res.status(404).json({
      success: false,
      message: '接口不存在'
    });
  });

  return app;
};

const createServer = async () => {
  await connectDB();

  const app = createApp();
  const server = http.createServer(app);

  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  initWebSocket(io);

  io.on('connection', (socket) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
    const ws = getWebSocket();

    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        ws.registerSocket(socket, decoded.userId, decoded.roles);
        console.log(`用户 ${decoded.userId} 已连接 WebSocket, 角色: ${decoded.roles}`);
      }
    }

    socket.on('disconnect', () => {
      ws.unregisterSocket(socket);
      console.log('用户断开 WebSocket 连接');
    });
  });

  initScheduledTasks();

  return server;
};

module.exports = { createApp, createServer };
