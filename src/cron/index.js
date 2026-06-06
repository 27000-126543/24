const cron = require('node-cron');
const {
  smartDispatchService,
  leakDetectionService,
  billingService,
  reportService
} = require('../services');

const initScheduledTasks = () => {
  console.log('初始化定时任务...');

  cron.schedule('*/15 * * * *', async () => {
    console.log('[定时任务] 执行水泵频率优化...');
    try {
      const results = await smartDispatchService.optimizePumpFrequencies();
      console.log(`  水泵调整完成: ${results.length} 个泵站`);
    } catch (e) {
      console.error('  水泵调整失败:', e.message);
    }
  });

  cron.schedule('*/30 * * * *', async () => {
    console.log('[定时任务] 执行加氯量优化...');
    try {
      const results = await smartDispatchService.optimizeChlorineDosage();
      console.log(`  加氯调整完成: ${results.length} 个水厂`);
    } catch (e) {
      console.error('  加氯调整失败:', e.message);
    }
  });

  cron.schedule('*/10 * * * *', async () => {
    console.log('[定时任务] 执行漏损异常检测...');
    try {
      const results = await leakDetectionService.detectAnomalies();
      console.log(`  检测到疑似漏损: ${results.length} 个`);
    } catch (e) {
      console.error('  漏损检测失败:', e.message);
    }
  });

  cron.schedule('0 0 0 * * *', async () => {
    console.log('[定时任务] 生成每日供水效率报表...');
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const report = await reportService.generateDailyReport(yesterday);
      console.log(`  报表生成完成: ${report.code}`);
    } catch (e) {
      console.error('  报表生成失败:', e.message);
    }
  });

  cron.schedule('0 30 8 * * *', async () => {
    console.log('[定时任务] 检查逾期账单...');
    try {
      const result = await billingService.checkOverdueBills();
      console.log(`  逾期账单处理: ${result.processed} 条`);
    } catch (e) {
      console.error('  逾期检查失败:', e.message);
    }
  });

  cron.schedule('0 0 1 * *', async () => {
    console.log('[定时任务] 生成月度账单...');
    try {
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const result = await billingService.generateMonthlyBills(
        lastMonth.getFullYear(),
        lastMonth.getMonth() + 1
      );
      console.log(`  月度账单生成: ${JSON.stringify(result)}`);
    } catch (e) {
      console.error('  月度账单生成失败:', e.message);
    }
  });

  console.log('定时任务初始化完成');
};

module.exports = { initScheduledTasks };
