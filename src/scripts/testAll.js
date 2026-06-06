const http = require('http');

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    }, (res) => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => resolve(buf));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(path, token) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path,
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + token }
    }, (res) => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => resolve(buf));
    });
    req.on('error', reject);
    req.end();
  });
}

const TOKEN = require('fs').readFileSync('/tmp/token.txt', 'utf8').trim();

async function main() {
  console.log('=== 上传 5 条正常压力数据 ===');
  for (let i = 0; i < 5; i++) {
    const v = 0.28 + Math.random() * 0.02;
    const r = await post('/api/data/sensor/PRES-001', { value: +v.toFixed(3) });
    const d = JSON.parse(r);
    console.log(`  #${i + 1} v=${v.toFixed(3)} abnormal=${d.data.isAbnormal}`);
    await new Promise(r => setTimeout(r, 200));
  }

  console.log('\n=== 上传 5 条异常低压数据 (触发漏损) ===');
  for (let i = 0; i < 5; i++) {
    const v = 0.08 + Math.random() * 0.02;
    const r = await post('/api/data/sensor/PRES-001', { value: +v.toFixed(3) });
    const d = JSON.parse(r);
    console.log(`  #${i + 1} v=${v.toFixed(3)} abnormal=${d.data.isAbnormal} type=${d.data.sensorData.abnormalType}`);
    await new Promise(r => setTimeout(r, 300));
  }

  console.log('\n=== 等待 3 秒处理漏损... ===');
  await new Promise(r => setTimeout(r, 3000));

  console.log('\n=== 漏损点列表 ===');
  const leaks = await get('/api/leak/leak-points', TOKEN);
  const leakArr = JSON.parse(leaks);
  console.log(`共 ${leakArr.length} 个漏损点`);
  leakArr.slice(0, 3).forEach(l => {
    console.log(`  ${l.code} | ${l.leakLevelName} | level=${l.leakLevel} | status=${l.status} | pressureDrop=${l.pressureDrop}`);
  });

  console.log('\n=== 勘察工单列表 ===');
  const orders = await get('/api/leak/work-orders', TOKEN);
  const orderArr = JSON.parse(orders);
  console.log(`共 ${orderArr.length} 个工单`);
  orderArr.slice(0, 3).forEach(o => {
    console.log(`  ${o.code} | ${o.title} | status=${o.status} | priority=${o.priority} | assignee=${o.assigneeId ? '已分配' : '待分配'}`);
  });

  console.log('\n✅ 全部测试完成');
}

main().catch(console.error);
