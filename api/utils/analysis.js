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
