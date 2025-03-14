const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

// Bybit API基础URL
const BASE_URL = 'https://api.bybit.com';

/**
 * 生成Bybit API请求所需的签名
 */
function generateBybitSignature(params, timestamp, apiSecret) {
  const queryString = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  
  const signString = timestamp + process.env.BYBIT_API_KEY + queryString;
  return crypto.createHmac('sha256', apiSecret).update(signString).digest('hex');
}

/**
 * 获取Bybit所有合约交易对
 */
async function getAllSymbols() {
  try {
    // 获取USDT永续合约
    const usdtResponse = await axios.get(`${BASE_URL}/v5/market/instruments-info`, {
      params: {
        category: 'linear'
      }
    });
    
    // 获取反向永续合约
    const inverseResponse = await axios.get(`${BASE_URL}/v5/market/instruments-info`, {
      params: {
        category: 'inverse'
      }
    });
    
    // 合并并提取交易对信息
    const usdtSymbols = usdtResponse.data.result.list || [];
    const inverseSymbols = inverseResponse.data.result.list || [];
    const allSymbols = [...usdtSymbols, ...inverseSymbols];
    
    // 过滤出活跃的交易对
    const activeSymbols = allSymbols
      .filter(symbol => symbol.status === 'Trading')
      .map(symbol => ({
        symbol: symbol.symbol,
        type: symbol.category,
        underlying: symbol.baseCoin,
        quoteCoin: symbol.quoteCoin
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
 */
async function getKlines(symbol, interval = '60', limit = 20) {
  try {
    const response = await axios.get(`${BASE_URL}/v5/market/kline`, {
      params: {
        category: 'linear',
        symbol: symbol,
        interval: interval,
        limit: limit
      }
    });
    
    if (!response.data.result || !response.data.result.list) {
      return [];
    }
    
    // 将K线数据转换为统一格式
    return response.data.result.list.map(kline => ({
      openTime: parseInt(kline[0]),
      open: parseFloat(kline[1]),
      high: parseFloat(kline[2]),
      low: parseFloat(kline[3]),
      close: parseFloat(kline[4]),
      volume: parseFloat(kline[5]),
      closeTime: parseInt(kline[0]) + getIntervalMilliseconds(interval),
      symbol: symbol
    })).reverse();
  } catch (error) {
    console.error(`获取 ${symbol} K线数据失败:`, error.message);
    return [];
  }
}

/**
 * 将时间间隔转换为毫秒数
 */
function getIntervalMilliseconds(interval) {
  const value = parseInt(interval);
  return value * 60 * 1000; // Bybit使用分钟作为基本单位
}

module.exports = {
  getAllSymbols,
  getKlines
};
