const { getAllSymbols, getKlines } = require('./utils/marketData');
const { analyzeSymbol } = require('./utils/analysis');
const { sendToFeishu } = require('./utils/notification');
require('dotenv').config();

/**
 * 主要扫描函数
 */
async function scanMarket() {
  console.log(`开始扫描OKX合约市场... (K线间隔: ${process.env.KLINE_INTERVAL || '15m'})`);
  
  const symbolsData = await getAllSymbols();
  const signals = [];
  
  const batchSize = 5;
  for (let i = 0; i < symbolsData.length; i += batchSize) {
    const batch = symbolsData.slice(i, i + batchSize);
    const promises = batch.map(async (symbolData) => {
      // 移除固定的时间间隔参数
      const klines = await getKlines(symbolData.symbol, 50);
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
    });
    
    const batchResults = await Promise.all(promises);
    signals.push(...batchResults.filter(signal => signal !== null));
    
    // 添加延迟以避免API限制
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // 步骤四：推送消息
  for (const signal of signals) {
    await sendToFeishu(signal);
  }
  
  console.log(`扫描完成，发现 ${signals.length} 个信号`);
  return { signals };
}

// 用于Vercel Serverless Function的处理函数
module.exports = async (req, res) => {
  try {
    // 如果是GET请求，执行一次扫描
    if (req.method === 'GET') {
      const result = await scanMarket();
      return res.status(200).json(result);
    }
    
    // 如果是POST请求，可以添加手动触发或其他功能
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
    console.error('服务器错误:', error);
    return res.status(500).json({ error: '服务器错误', message: error.message });
  }
};
