const { getAllSymbols, getKlines } = require('./utils/marketData');
const { analyzeSymbol } = require('./utils/analysis');
const { sendToFeishu } = require('./utils/notification');
require('dotenv').config();

// 存储最近的日志
let recentLogs = [];
const MAX_LOGS = 100;

// 添加时区转换辅助函数
function toLocalTime(date) {
  return new Date(date.getTime() + 8 * 60 * 60 * 1000).toISOString();
}

// 添加日志函数
function addLog(message, type = 'info') {
  const log = {
    timestamp: toLocalTime(new Date()),
    message,
    type
  };
  recentLogs.unshift(log);
  if (recentLogs.length > MAX_LOGS) {
    recentLogs.pop();
  }
  console.log(`${log.timestamp} - ${message}`);
}

// 修改HTML页面中的时间显示
const createHtmlPage = (logs) => `
    // ... existing code ...
            ${logs.map(log => `
                <div class="log-entry ${log.type}">
                    <span class="timestamp">${new Date(log.timestamp).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}</span>
                    <span class="message"> - ${log.message}</span>
                </div>
            `).join('')}
    // ... existing code ...
`;

async function scanMarket() {
  addLog('开始扫描OKX合约市场...');
  
  const symbolsData = await getAllSymbols();
  const signals = [];
  
  const batchSize = 5;
  for (let i = 0; i < symbolsData.length; i += batchSize) {
    const batch = symbolsData.slice(i, i + batchSize);
    const promises = batch.map(async (symbolData) => {
      const klines = await getKlines(symbolData.symbol, '30m', 20);
      if (klines.length === 0) {
        addLog(`获取 ${symbolData.symbol} K线数据失败`, 'warning');
        return null;
      }
      
      const signal = analyzeSymbol(klines);
      if (signal) {
        signal.details.type = symbolData.type;
        signal.details.underlying = symbolData.underlying;
        addLog(`发现信号: ${symbolData.symbol} - ${signal.type}`, 'success');
        return signal;
      }
      return null;
    });
    
    const batchResults = await Promise.all(promises);
    signals.push(...batchResults.filter(signal => signal !== null));
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  for (const signal of signals) {
    await sendToFeishu(signal);
  }
  
  addLog(`扫描完成，发现 ${signals.length} 个信号`);
  return { signals, logs: recentLogs };
}

// 创建一个简单的HTML页面
const createHtmlPage = (logs) => `
<!DOCTYPE html>
<html>
<head>
    <title>OKX Signal Bot 日志</title>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            background: #f5f5f5;
        }
        .container {
            max-width: 1000px;
            margin: 0 auto;
        }
        .header {
            background: #fff;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .logs {
            background: #fff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .log-entry {
            padding: 10px;
            border-bottom: 1px solid #eee;
        }
        .log-entry:last-child {
            border-bottom: none;
        }
        .timestamp {
            color: #666;
            font-size: 0.9em;
        }
        .success { color: #28a745; }
        .warning { color: #ffc107; }
        .error { color: #dc3545; }
        .refresh-btn {
            background: #007bff;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
        }
        .refresh-btn:hover {
            background: #0056b3;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>OKX Signal Bot 日志</h1>
            <button class="refresh-btn" onclick="location.reload()">刷新</button>
        </div>
        <div class="logs">
            ${logs.map(log => `
                <div class="log-entry ${log.type}">
                    <span class="timestamp">${new Date(log.timestamp).toLocaleString()}</span>
                    <span class="message"> - ${log.message}</span>
                </div>
            `).join('')}
        </div>
    </div>
</body>
</html>
`;

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      // 如果请求包含 format=json 参数，返回 JSON 格式
      if (req.query.format === 'json') {
        const result = await scanMarket();
        return res.status(200).json(result);
      }
      
      // 否则返回 HTML 页面
      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(createHtmlPage(recentLogs));
    }
    
    if (req.method === 'POST') {
      const { action } = req.body || {};
      
      if (action === 'scan') {
        const result = await scanMarket();
        return res.status(200).json(result);
      }
      
      return res.status(400).json({ error: '无效的操作' });
    }
    
    return res.status(405).json({ error: '方法不允许' });
  } catch (error) {
    addLog(`服务器错误: ${error.message}`, 'error');
    return res.status(500).json({ error: '服务器错误', message: error.message });
  }
};
