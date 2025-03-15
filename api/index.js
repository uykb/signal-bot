const { getAllSymbols, getKlines } = require('./utils/marketData');
const { analyzeSymbol } = require('./utils/analysis');
const { sendToFeishu } = require('./utils/notification');
require('dotenv').config();

// 存储最近的日志
let recentLogs = [];
const MAX_LOGS = 10;

// 添加日志函数
function addLog(message, type = 'info') {
  const log = {
    timestamp: new Date().toISOString(),
    message,
    type
  };
  recentLogs.unshift(log);
  if (recentLogs.length > MAX_LOGS) {
    recentLogs.pop();
  }
  console.log(`${log.timestamp} - ${message}`);
}

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
    <title>OKX Signal Bot 日志 (最近10条)</title>
    <meta charset="UTF-8">
    <style>
        /* ... existing styles ... */
        .header h1 {
            margin-bottom: 10px;
        }
        .header p {
            color: #666;
            margin-bottom: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>OKX Signal Bot 日志</h1>
            <p>显示最近10条日志记录</p>
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
