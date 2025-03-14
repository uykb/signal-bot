const { getAllSymbols, getKlines } = require('./utils/marketData');
const { analyzeSymbol } = require('./utils/analysis');
const { sendToFeishu } = require('./utils/notification');
require('dotenv').config();

/**
 * 主要扫描函数
 */
async function scanMarket() {
  console.log('开始扫描OKX合约市场...');
  
  // 步骤一：获取所有合约交易对
  const symbolsData = await getAllSymbols();
  const signals = [];
  
  // 限制并发请求数量
  const batchSize = 5; // OKX API限制更严格，减小批处理大小
  for (let i = 0; i < symbolsData.length; i += batchSize) {
    const batch = symbolsData.slice(i, i + batchSize);
    const promises = batch.map(async (symbolData) => {
      try {
        // 步骤二和三：获取K线数据并分析
        const klines = await getKlines(symbolData.symbol, '15m', 20);
        if (klines.length === 0) return null;
        
        // 分析是否满足信号条件
        const signal = analyzeSymbol(klines);
        if (signal) {
          // 添加合约类型信息
          signal.details.type = symbolData.type;
          signal.details.underlying = symbolData.underlying;
          console.log(`发现信号: ${symbolData.symbol} - ${signal.type}`);
          return signal;
        }
        return null;
      } catch (error) {
        console.error(`处理 ${symbolData.symbol} 时发生错误:`, error.message);
        return null;
      }
    });
    
    try {
      const batchResults = await Promise.all(promises);
      signals.push(...batchResults.filter(signal => signal !== null));
    } catch (error) {
      console.error('批处理请求失败:', error.message);
    }
    
    // 添加延迟以避免API限制
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // 步骤四：如果有信号，一次性发送所有信号
  if (signals.length > 0) {
    try {
      await sendToFeishu(signals);
    } catch (error) {
      console.error('发送信号到飞书失败:', error.message);
    }
  }
  
  console.log(`扫描完成，发现 ${signals.length} 个信号`);
  return { signals };
}

/**
 * 处理健康检查请求
 */
async function handleHealthCheck(res) {
  return res.status(200).json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: '服务正常运行'
  });
}

/**
 * 处理手动扫描请求
 */
async function handleManualScan(res) {
  try {
    const result = await scanMarket();
    return res.status(200).json({
      status: 'success',
      ...result
    });
  } catch (error) {
    console.error('扫描过程发生错误:', error);
    return res.status(500).json({
      status: 'error',
      error: '扫描过程发生错误',
      message: error.message
    });
  }
}

/**
 * Vercel Serverless Function 处理函数
 */
module.exports = async (req, res) => {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // 处理OPTIONS请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    // 健康检查端点
    if (req.method === 'GET' && req.query.health === 'check') {
      return handleHealthCheck(res);
    }
    
    // 如果是GET请求或带有scan操作的POST请求，执行扫描
    if (req.method === 'GET' || (req.method === 'POST' && req.body?.action === 'scan')) {
      return handleManualScan(res);
    }
    
    // 其他无效请求
    return res.status(400).json({ 
      status: 'error',
      error: '无效的请求',
      message: '不支持的HTTP方法或操作'
    });
    
  } catch (error) {
    console.error('服务器错误:', error);
    return res.status(500).json({ 
      status: 'error',
      error: '服务器错误',
      message: error.message
    });
  }
};
