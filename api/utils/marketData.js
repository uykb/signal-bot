const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

// OKX API基础URL
const BASE_URL = 'https://www.okx.com';

/**
 * 生成OKX API请求所需的签名和头信息
 * @param {string} method HTTP方法
 * @param {string} requestPath 请求路径
 * @param {Object} queryParams 查询参数
 * @returns {Object} 请求头信息
 */
function generateOkxHeaders(method, requestPath, queryParams = '') {
  const apiKey = process.env.OKX_API_KEY;
  const secretKey = process.env.OKX_API_SECRET;
  const passphrase = process.env.OKX_PASSPHRASE;
  
  if (!apiKey || !secretKey || !passphrase) {
    console.warn('OKX API密钥未完全设置，将使用公共API');
    return {};
  }
  
  const timestamp = new Date().toISOString();
  let queryString = '';
  
  if (typeof queryParams === 'object' && Object.keys(queryParams).length > 0) {
    queryString = '?' + new URLSearchParams(queryParams).toString();
  } else if (typeof queryParams === 'string' && queryParams) {
    queryString = '?' + queryParams;
  }
  
  const signString = timestamp + method + requestPath + queryString;
  const signature = crypto.createHmac('sha256', secretKey)
    .update(signString)
    .digest('base64');
  
  return {
    'OK-ACCESS-KEY': apiKey,
    'OK-ACCESS-SIGN': signature,
    'OK-ACCESS-TIMESTAMP': timestamp,
    'OK-ACCESS-PASSPHRASE': passphrase,
    'Content-Type': 'application/json'
  };
}

/**
 * 获取OKX所有合约交易对
 */
async function getAllSymbols() {
  try {
    // 获取所有永续合约交易对
    const swapResponse = await axios.get(`${BASE_URL}/api/v5/public/instruments`, {
      params: {
        instType: 'SWAP'
      }
    });
    
    // 获取所有交割合约交易对
    const futuresResponse = await axios.get(`${BASE_URL}/api/v5/public/instruments`, {
      params: {
        instType: 'FUTURES'
      }
    });
    
    // 合并并提取交易对信息
    const swapSymbols = swapResponse.data.data || [];
    const futuresSymbols = futuresResponse.data.data || [];
    const allSymbols = [...swapSymbols, ...futuresSymbols];
    
    // 过滤出活跃的交易对
    const activeSymbols = allSymbols
      .filter(symbol => symbol.state === 'live')
      .map(symbol => ({
        symbol: symbol.instId,
        type: symbol.instType,
        underlying: symbol.uly
      }));
    
    console.log(`获取到 ${activeSymbols.length} 个合约交易对`);
    return activeSymbols;
  } catch (error) {
    console.error('获取交易对失败:', error.message);
    return [];
  }
}

/**
 * 获取指定交易对的K线数据
 * @param {string} symbol 交易对
 * @param {number} limit 获取数量
 */
async function getKlines(symbol, limit = 20) {
  try {
    // 从环境变量获取K线间隔，默认为15分钟
    const okxInterval = process.env.KLINE_INTERVAL || '15m';
    
    const response = await axios.get(`${BASE_URL}/api/v5/market/candles`, {
      params: {
        instId: symbol,
        bar: okxInterval.toUpperCase(),
        limit
      }
    });
    
    if (!response.data.data || response.data.data.length === 0) {
      return [];
    }
    
    // 将K线数据转换为更易用的格式
    // OKX K线数据格式: [timestamp, open, high, low, close, vol, volCcy, volCcyQuote, confirm]
    return response.data.data.map(kline => ({
      openTime: parseInt(kline[0]),
      open: parseFloat(kline[1]),
      high: parseFloat(kline[2]),
      low: parseFloat(kline[3]),
      close: parseFloat(kline[4]),
      volume: parseFloat(kline[5]),
      quoteVolume: parseFloat(kline[7]),
      closeTime: parseInt(kline[0]) + getIntervalMilliseconds(okxInterval),
      trades: 0, // OKX不提供交易次数
      symbol: symbol
    })).reverse(); // OKX返回的是最新的在前，需要反转
  } catch (error) {
    console.error(`获取 ${symbol} K线数据失败:`, error.message);
    return [];
  }
}

/**
 * 将时间间隔转换为毫秒数
 * @param {string} interval 时间间隔
 * @returns {number} 毫秒数
 */
function getIntervalMilliseconds(interval) {
  const unit = interval.slice(-1);
  const value = parseInt(interval.slice(0, -1)) || 1;
  
  switch (unit) {
    case 'M': return value * 60 * 1000;
    case 'H': return value * 60 * 60 * 1000;
    case 'D': return value * 24 * 60 * 60 * 1000;
    case 'W': return value * 7 * 24 * 60 * 60 * 1000;
    default: return 60 * 1000; // 默认1分钟
  }
}

module.exports = {
  getAllSymbols,
  getKlines
};
