# 智慧城市供水管网智能调度与漏损检测系统 - 后端API

## 系统概述

本系统是一个完整的智慧城市供水管网管理平台，提供以下核心功能：

1. **智能调度** - 基于管网压力模型自动调整水泵运行频率和加氯量
2. **漏损检测** - 压力传感器异常自动标记疑似漏损点，计算漏损等级
3. **勘察抢修** - 自动分配勘察工单，智能分配抢修队伍
4. **资产台账** - 修复记录自动更新，30天重复漏损标记高风险
5. **水费管理** - 居民申诉分析、阶梯水价计费、欠费限水
6. **报表系统** - 每日供水效率报表（漏损率、产销差、吨水能耗）
7. **实时推送** - WebSocket 实时通知告警、工单、账单等

## 技术栈

- **运行时**: Node.js
- **Web 框架**: Express.js
- **数据库**: MongoDB (Mongoose ODM)
- **实时通信**: Socket.IO
- **认证**: JWT (JSON Web Token)
- **定时任务**: node-cron
- **报表导出**: ExcelJS
- **密码加密**: bcryptjs

## 快速开始

### 1. 环境要求

- Node.js >= 16
- MongoDB >= 4.4

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

复制 `.env` 文件并根据需要修改：

```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/smart_water_network
JWT_SECRET=your-secret-key
```

### 4. 初始化种子数据（可选）

```bash
npm run seed
```

此命令将创建：
- 11 个测试用户（管理员、调度员、勘察员、抢修员、规划师、催款员、居民）
- 2 个水厂、2 个泵站、3 个管段、8 个传感器
- 30 天的居民用水记录

所有测试用户密码均为：`123456`

### 5. 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

服务启动后：
- HTTP API: `http://localhost:3000/api`
- WebSocket: `ws://localhost:3000`
- 健康检查: `http://localhost:3000/api/health`

## API 接口文档

### 认证相关 (`/api/auth`)

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | `/api/auth/register` | 用户注册 | 公开 |
| POST | `/api/auth/login` | 用户登录 | 公开 |
| GET | `/api/auth/me` | 获取当前用户信息 | 已登录 |
| POST | `/api/auth/change-password` | 修改密码 | 已登录 |
| GET | `/api/auth/users` | 获取用户列表 | admin |

**登录示例:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"123456"}'
```

返回:
```json
{
  "user": { "_id": "...", "username": "admin", "roles": ["admin"], ... },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

后续请求需在 Header 中携带:
```
Authorization: Bearer <token>
```

### 数据上传接口 (`/api/data`)

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | `/api/data/water-plant/:plantCode` | 上传水厂数据 | 设备/系统 |
| POST | `/api/data/pump-station/:stationCode` | 上传泵站数据 | 设备/系统 |
| POST | `/api/data/sensor/:sensorCode` | 上传单个传感器数据 | 设备/系统 |
| POST | `/api/data/sensors/batch` | 批量上传传感器数据 | 设备/系统 |
| POST | `/api/data/water-meter/:meterNo` | 上传水表读数 | 设备/系统 |

**上传水厂数据示例:**
```bash
curl -X POST http://localhost:3000/api/data/water-plant/WP001 \
  -H "Content-Type: application/json" \
  -d '{
    "inflowRate": 350000,
    "waterQuality": { "chlorine": 0.42, "ph": 7.2, "turbidity": 0.5 },
    "energyConsumption": 8500
  }'
```

**上传压力传感器数据（异常会触发漏损检测）:**
```bash
curl -X POST http://localhost:3000/api/data/sensor/PRS002 \
  -H "Content-Type: application/json" \
  -d '{"value": 0.10}'
```

### 智能调度接口 (`/api/dispatch`)

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/dispatch/optimize/pumps` | 执行水泵频率优化 | admin, operator |
| GET | `/api/dispatch/optimize/chlorine` | 执行加氯量优化 | admin, operator |
| POST | `/api/dispatch/pump/:stationId/adjust` | 人工调整水泵频率 | admin, operator |
| POST | `/api/dispatch/chlorine/:plantId/adjust` | 人工调整加氯量 | admin, operator |
| GET | `/api/dispatch/history` | 获取调整历史 | admin, operator |

### 漏损与工单接口 (`/api/leak`)

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/leak/detect` | 手动触发漏损检测 | admin, operator |
| GET | `/api/leak/leak-points` | 获取漏损点列表 | 已登录 |
| GET | `/api/leak/leak-points/:id` | 获取漏损点详情 | 已登录 |
| GET | `/api/leak/work-orders` | 获取勘察工单列表 | 已登录 |
| POST | `/api/leak/work-orders/:id/accept` | 接单（勘察员） | inspector |
| POST | `/api/leak/work-orders/:id/start` | 开始勘察 | inspector |
| POST | `/api/leak/work-orders/:id/submit` | 提交勘察结果 | inspector |
| GET | `/api/leak/repair-tasks` | 获取抢修任务列表 | 已登录 |
| POST | `/api/leak/repair-tasks/:id/accept` | 接受抢修任务 | repairer |
| POST | `/api/leak/repair-tasks/:id/start` | 开始抢修 | repairer |
| POST | `/api/leak/repair-tasks/:id/complete` | 完成抢修 | repairer |
| POST | `/api/leak/repair-tasks/:id/verify` | 验收抢修 | admin |

**提交勘察结果示例（真实漏损会自动生成抢修任务）:**
```bash
curl -X POST http://localhost:3000/api/leak/work-orders/<workOrderId>/submit \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "isRealLeak": true,
    "leakType": "pipe_crack",
    "leakSize": "medium",
    "confirmedLeakLevel": 2,
    "notes": "管段接口处有明显裂缝"
  }'
```

### 居民服务接口 (`/api/resident`)

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | `/api/resident/complaints` | 提交水费异常申诉 | resident |
| GET | `/api/resident/complaints/my` | 获取我的申诉 | resident |
| GET | `/api/resident/complaints` | 获取所有申诉 | 已登录 |
| GET | `/api/resident/complaints/:id` | 获取申诉详情 | 已登录 |
| POST | `/api/resident/complaints/:id/respond` | 处理申诉 | admin |
| GET | `/api/resident/water-usage` | 获取用水记录 | 已登录 |
| GET | `/api/resident/water-usage/statistics` | 获取用水统计 | 已登录 |
| GET | `/api/resident/bills/my` | 获取我的账单 | resident |
| GET | `/api/resident/bills` | 获取所有账单 | 已登录 |
| GET | `/api/resident/bills/:id` | 获取账单详情 | 已登录 |
| POST | `/api/resident/bills/generate` | 生成月度账单 | admin |
| POST | `/api/resident/bills/:id/pay` | 缴费 | 已登录 |
| GET | `/api/resident/bills/check-overdue` | 检查逾期账单 | admin |
| GET | `/api/resident/restriction-orders` | 获取限水指令 | 已登录 |

**提交水费异常申诉（系统自动分析）:**
```bash
curl -X POST http://localhost:3000/api/resident/complaints \
  -H "Authorization: Bearer <resident_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "本月水费异常偏高",
    "description": "本月水费比平时高出3倍，怀疑水表有问题",
    "type": "bill_anomaly"
  }'
```

### 报表与通知接口 (`/api/reports`)

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/reports/dashboard` | 获取仪表盘统计 | 已登录 |
| POST | `/api/reports/generate/daily` | 生成日报表 | admin |
| GET | `/api/reports` | 获取报表列表 | 已登录 |
| GET | `/api/reports/:id` | 获取报表详情 | 已登录 |
| GET | `/api/reports/export/excel` | 导出报表Excel | 已登录 |
| GET | `/api/reports/notifications/list` | 获取通知列表 | 已登录 |
| POST | `/api/reports/notifications/:id/read` | 标记通知已读 | 已登录 |
| POST | `/api/reports/notifications/read-all` | 全部标记已读 | 已登录 |

**导出报表示例:**
```bash
curl -X GET "http://localhost:3000/api/reports/export/excel?startDate=2024-01-01&endDate=2024-01-31" \
  -H "Authorization: Bearer <token>" \
  -o report.xlsx
```

## WebSocket 实时推送

### 连接方式

```javascript
const socket = io('ws://localhost:3000', {
  auth: { token: '<your_jwt_token>' }
});
```

### 推送事件

| 事件名 | 说明 | 接收对象 |
|--------|------|----------|
| `notification` | 通用通知 | 对应用户/角色 |
| `new_work_order` | 新勘察工单 | inspector, admin |
| `new_repair_task` | 新抢修任务 | repairer, admin |
| `alert` | 告警信息 | operator, admin |
| `new_bill` | 新账单通知 | 对应用户 |
| `work_order_updated` | 工单状态更新 | 负责人, admin |

### 监听示例

```javascript
socket.on('notification', (data) => {
  console.log('收到通知:', data.title, data.content);
});

socket.on('alert', (alert) => {
  console.warn('告警:', alert.priority, alert.title);
});
```

## 系统角色说明

| 角色 | 代码 | 说明 |
|------|------|------|
| 系统管理员 | `admin` | 全权限，管理用户、验收、生成账单等 |
| 调度员 | `operator` | 监控管网压力、执行调度操作 |
| 勘察员 | `inspector` | 接收勘察工单、现场确认漏损 |
| 抢修员 | `repairer` | 接收抢修任务、执行管道修复 |
| 居民用户 | `resident` | 查看账单、提交申诉、查看用水 |
| 规划师 | `planner` | 接收高风险管段预警 |
| 催款员 | `collector` | 处理逾期账单催收 |

## 定时任务

系统启动后自动注册以下定时任务：

| 执行频率 | 任务 | 说明 |
|----------|------|------|
| 每 15 分钟 | 水泵频率优化 | 根据管网压力模型自动调整 |
| 每 30 分钟 | 加氯量优化 | 根据余氯数据自动调整 |
| 每 10 分钟 | 漏损异常检测 | 扫描异常传感器数据 |
| 每天 00:00 | 生成日报表 | 计算漏损率、产销差等指标 |
| 每天 08:30 | 检查逾期账单 | 触发逾期提醒和限水指令 |
| 每月 1 日 00:00 | 生成月度账单 | 阶梯水价自动计算 |

## 核心数据模型

- **User** - 用户（多角色）
- **WaterPlant** - 水厂
- **PumpStation** - 泵站
- **PipeSegment** - 管段资产
- **Sensor** - 传感器
- **WaterPlantData / PumpStationData / SensorData** - 实时数据
- **AdjustmentLog** - 调度调整日志
- **LeakPoint** - 漏损点
- **WorkOrder** - 勘察工单
- **RepairTask** - 抢修任务
- **RepairRecord** - 修复记录（资产台账）
- **WaterUsage** - 用水记录
- **Complaint** - 申诉工单
- **Bill** - 水费账单
- **RestrictionOrder** - 限水指令
- **EfficiencyReport** - 效率报表
- **Notification** - 系统通知

## 目录结构

```
src/
├── config/           # 配置文件
├── controllers/      # 控制器层
├── cron/             # 定时任务
├── middleware/       # 中间件（认证等）
├── models/           # Mongoose 数据模型
├── routes/           # API 路由
├── scripts/          # 脚本（种子数据等）
├── services/         # 业务逻辑层
├── utils/            # 工具函数
├── app.js            # Express App 创建
└── server.js         # 服务器入口
```
