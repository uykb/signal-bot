require('dotenv').config();

/**
 * 检查是否为针形态
 * 当K线的针的部分大于实体部分的1.5倍数，那么这根K线定义为针
 */
function isPinBar(kline) {
  const PIN_BAR_RATIO = parseFloat(process.env.PIN_BAR_RATIO) || 1.5;
  
  const bodySize = Math.abs(kline.close - kline.open);
  const upperWick = kline.high - Math.max(kline.open, kline.close);
  const lowerWick = Math.min(kline.open, kline.close) - kline.low;
  const totalWickSize = upperWick + lowerWick;
  
  // 如果实体太小，可能会导致比率过大，设置一个最小值
  if (bodySize < 0.0001) return false;
  
  return totalWickSize / bodySize >= PIN_BAR_RATIO;
}

/**
 * 检查成交量是否超过阈值
 * 当前K线对应的成交量大于之前10根成交量平均值的1.5倍
 */
function hasSignificantVolume(klines) {
  const VOLUME_THRESHOLD = parseFloat(process.env.VOLUME_THRESHOLD) || 1.5;
  const LOOKBACK_PERIOD = parseInt(process.env.LOOKBACK_PERIOD) || 10;
  
  if (klines.length <= LOOKBACK_PERIOD) return false;
  
  const currentVolume = klines[klines.length - 1].volume;
  const previousKlines = klines.slice(-LOOKBACK_PERIOD - 1, -1);
  const averageVolume = previousKlines.reduce((sum, kline) => sum + kline.volume, 0) / previousKlines.length;
  
  return currentVolume >= averageVolume * VOLUME_THRESHOLD;
}

/**
 * 分析交易对是否满足信号条件
 */
function analyzeSymbol(klines) {
  if (klines.length <= 10) return null;
  
  const latestKline = klines[klines.length - 1];
  const isPinBarPattern = isPinBar(latestKline);
  const hasVolume = hasSignificantVolume(klines);
  
  if (isPinBarPattern && hasVolume) {
    // 判断是看涨还是看跌信号
    const isBullish = latestKline.close > latestKline.open;
    
    return {
      type: isBullish ? '看涨信号' : '看跌信号',
      time: new Date(latestKline.closeTime).toLocaleString(),
      details: {
        symbol: latestKline.symbol,
        price: latestKline.close,
        volume: latestKline.volume,
        volumeRatio: (latestKline.volume / (klines.slice(-11, -1).reduce((sum, k) => sum + k.volume, 0) / 10)).toFixed(2)
      }
    };
  }
  
  return null;
}

module.exports = {
  isPinBar,
  hasSignificantVolume,
  analyzeSymbol
};
    
