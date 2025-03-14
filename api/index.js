const { getAllSymbols, getKlines } = require('./utils/marketData');
const { analyzeSymbol } = require('./utils/analysis');
const { sendToFeishu } = require('./utils/notification');
require('dotenv').config();

async function scanMarket() {
    console.log('开始扫描Bybit合约市场...');
    
    try {
        const activeSymbols = await getAllSymbols();
        const signals = [];
        const batchSize = 3;
        
        for (let i = 0; i < activeSymbols.length; i += batchSize) {
            const batch = activeSymbols.slice(i, i + batchSize);
            const promises = batch.map(async (symbolData) => {
                try {
                    const klines = await getKlines(symbolData.symbol, '60', 20);
                    if (klines.length === 0) return null;
                    
                    const signal = analyzeSymbol(klines);
                    if (signal) {
                        signal.details = {
                            ...signal.details,
                            type: symbolData.type,
                            underlying: symbolData.underlying,
                            quoteCoin: symbolData.quoteCoin
                        };
                        console.log(`发现信号: ${symbolData.symbol} - ${signal.type}`);
                        return signal;
                    }
                } catch (error) {
                    console.error(`分析 ${symbolData.symbol} 时出错:`, error.message);
                }
                return null;
            });
            
            try {
                const batchResults = await Promise.all(promises);
                signals.push(...batchResults.filter(signal => signal !== null));
            } catch (error) {
                console.error('处理批次数据时出错:', error);
            }
            
            await new Promise(resolve => setTimeout(resolve, 1500));
        }
        
        if (signals.length > 0) {
            for (const signal of signals) {
                try {
                    await sendToFeishu(signal);
                } catch (error) {
                    console.error('发送飞书通知失败:', error);
                }
            }
        }
        
        return { 
            signals,
            timestamp: new Date().toISOString(),
            totalSymbols: activeSymbols.length
        };
    } catch (error) {
        console.error('扫描市场时出错:', error);
        throw error;
    }
}

module.exports = async (req, res) => {
    try {
        if (req.method === 'GET') {
            const result = await scanMarket();
            return res.status(200).json(result);
        }
        
        return res.status(405).json({
            error: '方法不允许',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('服务器错误:', error);
        return res.status(500).json({
            error: '服务器错误',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};
