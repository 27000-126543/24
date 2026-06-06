const models = require('../models');
const { getWebSocket } = require('./webSocketService');

class NotificationService {
  async createNotification(data) {
    const notification = await models.Notification.create(data);

    try {
      const ws = getWebSocket();
      if (data.recipientId) {
        ws.sendToUser(data.recipientId.toString(), 'notification', notification);
      }
      if (data.recipientRole) {
        ws.sendToRole(data.recipientRole, 'notification', notification);
      }
    } catch (e) {
      console.warn('WebSocket 推送失败:', e.message);
    }

    return notification;
  }

  async createAlert(alertData) {
    return this.createNotification({
      ...alertData,
      type: 'alert',
      recipientRole: alertData.recipientRole || 'admin'
    });
  }

  async notifyNewWorkOrder(workOrder) {
    await this.createNotification({
      recipientId: workOrder.assigneeId,
      type: 'work_order',
      title: `新勘察工单: ${workOrder.code}`,
      content: `您有一条新的勘察任务，请及时处理。`,
      relatedId: workOrder._id,
      relatedType: 'WorkOrder',
      priority: workOrder.priority
    });
    await this.createNotification({
      recipientRole: 'admin',
      type: 'work_order',
      title: `新勘察工单生成: ${workOrder.code}`,
      content: `系统自动生成勘察工单，已分配给勘察员。`,
      relatedId: workOrder._id,
      relatedType: 'WorkOrder',
      priority: workOrder.priority
    });
  }

  async notifyNewRepairTask(repairTask) {
    await this.createNotification({
      recipientId: repairTask.assigneeTeamId,
      type: 'repair_task',
      title: `新抢修任务: ${repairTask.code}`,
      content: `您有一条新的抢修任务，请及时处理。`,
      relatedId: repairTask._id,
      relatedType: 'RepairTask',
      priority: repairTask.priority
    });
    await this.createNotification({
      recipientRole: 'admin',
      type: 'repair_task',
      title: `新抢修任务生成: ${repairTask.code}`,
      content: `系统已分配抢修队伍。`,
      relatedId: repairTask._id,
      relatedType: 'RepairTask',
      priority: repairTask.priority
    });
  }

  async notifyBillGenerated(bill) {
    return this.createNotification({
      recipientId: bill.userId,
      type: 'bill',
      title: `水费账单: ${bill.code}`,
      content: `您有新的水费账单，金额 ¥${bill.totalAmount.toFixed(2)}，请及时缴纳。`,
      relatedId: bill._id,
      relatedType: 'Bill',
      priority: 'medium'
    });
  }

  async notifyOverdueBill(bill) {
    await this.createNotification({
      recipientId: bill.userId,
      type: 'bill',
      title: `账单逾期提醒: ${bill.code}`,
      content: `您的水费账单已逾期${bill.overdueDays}天，金额 ¥${bill.totalAmount.toFixed(2)}，请尽快缴纳。`,
      relatedId: bill._id,
      relatedType: 'Bill',
      priority: 'high'
    });
    if (bill.collectorId) {
      await this.createNotification({
        recipientId: bill.collectorId,
        type: 'bill',
        title: `逾期账单待催收: ${bill.code}`,
        content: `用户账单已逾期，请进行催收。`,
        relatedId: bill._id,
        relatedType: 'Bill',
        priority: 'high'
      });
    }
  }

  async notifyRestrictionOrder(order) {
    await this.createNotification({
      recipientId: order.userId,
      type: 'restriction',
      title: '限水通知',
      content: `由于水费长期逾期，您的供水将被限制，请尽快缴纳水费。`,
      relatedId: order._id,
      relatedType: 'RestrictionOrder',
      priority: 'critical'
    });
    return this.createNotification({
      recipientRole: 'collector',
      type: 'restriction',
      title: '限水指令已生成',
      content: `用户 ${order.userId} 已生成限水指令。`,
      relatedId: order._id,
      relatedType: 'RestrictionOrder',
      priority: 'high'
    });
  }

  async notifyComplaintStatus(complaint) {
    return this.createNotification({
      recipientId: complaint.userId,
      type: 'complaint',
      title: `申诉状态更新: ${complaint.code}`,
      content: `您的申诉状态已更新为: ${complaint.status}`,
      relatedId: complaint._id,
      relatedType: 'Complaint',
      priority: 'medium'
    });
  }

  async notifyHighRiskPipe(pipeSegment, plannerIds) {
    for (const plannerId of plannerIds) {
      await this.createNotification({
        recipientId: plannerId,
        type: 'alert',
        title: '高风险管段预警',
        content: `管段 ${pipeSegment.code} 30天内重复漏损，已标记为高风险，请规划部门评估。`,
        relatedId: pipeSegment._id,
        relatedType: 'PipeSegment',
        priority: 'critical'
      });
    }
  }

  async getNotifications(userId, options = {}) {
    const { isRead, limit = 20, skip = 0 } = options;
    const query = { recipientId: userId };
    if (isRead !== undefined) query.isRead = isRead;

    return models.Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
  }

  async markAsRead(notificationId, userId) {
    return models.Notification.findOneAndUpdate(
      { _id: notificationId, recipientId: userId },
      { isRead: true, readAt: new Date() },
      { new: true }
    );
  }

  async markAllAsRead(userId) {
    return models.Notification.updateMany(
      { recipientId: userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );
  }
}

module.exports = new NotificationService();
