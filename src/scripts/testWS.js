const io = require('socket.io-client');

const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2YTIzYTMyNDFjNzFmYWNkNDdhMDU5OWUiLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZXMiOlsiYWRtaW4iXSwiaWF0IjoxNzgwNzIwNjIxLCJleHAiOjE3ODA4MDcwMjF9.giccN8mkmseOS71H-gTLVmV5t8_R93O62AzW1rK2bTE';

console.log('=== 测试 WebSocket 连接 ===');

const socket = io('http://localhost:3000', {
  auth: { token: TOKEN },
  transports: ['websocket']
});

socket.on('connect', () => {
  console.log('✅ WebSocket 连接成功!');
  console.log('   Socket ID:', socket.id);
  
  socket.on('notification', (data) => {
    console.log('\n📩 收到通知:', JSON.stringify(data, null, 2));
  });

  socket.on('alert', (data) => {
    console.log('\n⚠️  收到告警:', JSON.stringify(data, null, 2));
  });

  socket.on('new_work_order', (data) => {
    console.log('\n🛠️  收到新工单:', JSON.stringify(data, null, 2));
  });

  setTimeout(() => {
    console.log('\n⏳ 3秒后断开连接...');
    socket.disconnect();
    console.log('✅ WebSocket 测试完成，连接正常!');
    process.exit(0);
  }, 3000);
});

socket.on('connect_error', (err) => {
  console.error('❌ WebSocket 连接失败:', err.message);
  process.exit(1);
});

socket.on('disconnect', (reason) => {
  console.log('WebSocket 已断开, 原因:', reason);
});
