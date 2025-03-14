const { getAllSymbols, getKlines, initializeWebSocket } = require('./utils/marketData');
const { analyzeSymbol } = require('./utils/analysis');
const { sendToFeishu } = require('./utils/notification');
require('dotenv').config();

// 存储初始化状态
let initialized = false;
let activeSymbols = [];

/**
 * 初始化服务
 */
async function initializeService() {
    try {
        activeSymbols = await getAllSymbols();
        if (activeSymbols.length > 0) {
            initializeWebSocket(activeSymbols);
            console.log('服务初始化成功');
            return true;
        }
        return false;
    } catch (error) {
        console.error('服务初始化失败:', error);
        return false;
    }
}

/**
 * 主要扫描函数
 */
async function scanMarket() {
    console.log('开始扫描Bybit合约市场...');
    
    if (!initialized || activeSymbols.length === 0) {
        activeSymbols = await getAllSymbols();
    }
    
    const signals = [];
    const batchSize = 3; // Bybit API限制
    
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
                        quoteCoin: symbolData.quoteCoin,
                        tickSize: symbolData.tickSize,
                        minPrice: symbolData.minPrice,
                        maxPrice: symbolData.maxPrice
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
        
        // 增加延迟以避免触发频率限制
        await new Promise(resolve => setTimeout(resolve, 1500));
    }
    
    // 发送信号到飞书
    if (signals.length > 0) {
        console.log(`发现 ${signals.length} 个信号，开始发送通知...`);
        for (const signal of signals) {
            try {
                await sendToFeishu(signal);
            } catch (error) {
                console.error('发送飞书通知失败:', error);
            }
        }
    } else {
        console.log('本次扫描未发现信号');
    }
    
    return { 
        signals,
        timestamp: new Date().toISOString(),
        totalSymbols: activeSymbols.length
    };
}

/**
 * 健康检查函数
 */
async function healthCheck() {
    try {
        const testSymbols = await getAllSymbols();
        return {
            status: 'healthy',
            symbolCount: testSymbols.length,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        return {
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Vercel Serverless Function处理函数
 */
module.exports = async (req, res) => {
    try {
        // 初始化检查
        if (!initialized) {
            initialized = await initializeService();
            if (!initialized) {
                return res.status(500).json({
                    error: '服务初始化失败',
                    timestamp: new Date().toISOString()
                });
            }
        }
        
        // 路由处理
        switch (req.method) {
            case 'GET':
                // 健康检查端点
                if (req.query.health) {
                    const health = await healthCheck();
                    return res.status(health.status === 'healthy' ? 200 : 500).json(health);
                }
                // 常规扫描
                const result = await scanMarket();
                return res.status(200).json(result);
                
            case 'POST':
                const { action } = req.body || {};
                
                switch (action) {
                    case 'scan':
                        const scanResult = await scanMarket();
                        return res.status(200).json(scanResult);
                        
                    case 'reinitialize':
                        initialized = false;
                        initialized = await initializeService();
                        return res.status(200).json({
                            status: initialized ? 'success' : 'failed',
                            message: initialized ? '服务重新初始化成功' : '服务重新初始化失败',
                            timestamp: new Date().toISOString()
                        });
                        
                    default:
                        return res.status(400).json({
                            error: '无效的操作',
                            timestamp: new Date().toISOString()
                        });
                }
                
            default:
                return res.status(405).json({
                    error: '方法不允许',
                    timestamp: new Date().toISOString()
                });
        }
    } catch (error) {
        console.error('服务器错误:', error);
        return res.status(500).json({
            error: '服务器错误',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};
