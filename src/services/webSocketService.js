class WebSocketService {
  constructor(io) {
    this.io = io;
    this.userSockets = new Map();
    this.roleSockets = new Map();
  }

  registerSocket(socket, userId, roles) {
    this.userSockets.set(userId, socket.id);
    roles.forEach(role => {
      if (!this.roleSockets.has(role)) {
        this.roleSockets.set(role, new Set());
      }
      this.roleSockets.get(role).add(socket.id);
    });
    socket.userId = userId;
    socket.roles = roles;
  }

  unregisterSocket(socket) {
    if (socket.userId) {
      this.userSockets.delete(socket.userId);
    }
    if (socket.roles) {
      socket.roles.forEach(role => {
        const sockets = this.roleSockets.get(role);
        if (sockets) {
          sockets.delete(socket.id);
        }
      });
    }
  }

  sendToUser(userId, event, data) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
      return true;
    }
    return false;
  }

  sendToRole(role, event, data) {
    const sockets = this.roleSockets.get(role);
    if (sockets && sockets.size > 0) {
      sockets.forEach(socketId => {
        this.io.to(socketId).emit(event, data);
      });
      return true;
    }
    return false;
  }

  broadcast(event, data) {
    this.io.emit(event, data);
  }

  notifyNewWorkOrder(workOrder) {
    this.sendToRole('inspector', 'new_work_order', workOrder);
    this.sendToRole('admin', 'new_work_order', workOrder);
  }

  notifyNewRepairTask(repairTask) {
    this.sendToRole('repairer', 'new_repair_task', repairTask);
    this.sendToRole('admin', 'new_repair_task', repairTask);
  }

  notifyAlert(alert) {
    this.sendToRole('admin', 'alert', alert);
    this.sendToRole('operator', 'alert', alert);
  }

  notifyBill(bill) {
    if (bill.userId) {
      this.sendToUser(bill.userId, 'new_bill', bill);
    }
  }

  notifyWorkOrderStatusChange(workOrder) {
    if (workOrder.assigneeId) {
      this.sendToUser(workOrder.assigneeId, 'work_order_updated', workOrder);
    }
    this.sendToRole('admin', 'work_order_updated', workOrder);
  }
}

let wsService = null;

const initWebSocket = (io) => {
  wsService = new WebSocketService(io);
  return wsService;
};

const getWebSocket = () => {
  if (!wsService) {
    throw new Error('WebSocket service not initialized');
  }
  return wsService;
};

module.exports = { initWebSocket, getWebSocket };
