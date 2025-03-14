const axios = require('axios');
const crypto = require('crypto');
const BybitWebSocket = require('./websocket');
require('dotenv').config();

const BASE_URL = 'https://api.bybit.com';
const wsClient = new BybitWebSocket();
let klineCache = new Map();

/**
 * 生成Bybit API请求所需的签名和时间戳
 */
function generateSignature(params = {}) {
    const timestamp = Date.now();
    const apiKey = process.env.BYBIT_API_KEY;
    const apiSecret = process.env.BYBIT_API_SECRET;

    const queryString = Object.keys(params)
        .sort()
        .map(key => `${key}=${params[key]}`)
        .join('&');

    const signString = timestamp + apiKey + queryString;
    const signature = crypto
        .createHmac('sha256', apiSecret)
        .update(signString)
        .digest('hex');

    return {
        timestamp,
        signature,
        queryString: queryString ? `?${queryString}` : ''
    };
}

/**
 * 获取Bybit所有合约交易对
 */
async function getAllSymbols() {
    try {
        const categories = ['linear', 'inverse'];
        let allSymbols = [];

        for (const category of categories) {
            const response = await axios.get(`${BASE_URL}/v5/market/instruments-info`, {
                params: {
                    category: category
                }
            });

            if (response.data.result && response.data.result.list) {
                const symbols = response.data.result.list
                    .filter(symbol => symbol.status === 'Trading')
                    .map(symbol => ({
                        symbol: symbol.symbol,
                        type: category,
                        underlying: symbol.baseCoin,
                        quoteCoin: symbol.quoteCoin,
                        tickSize: parseFloat(symbol.priceFilter.tickSize),
                        minPrice: parseFloat(symbol.priceFilter.minPrice),
                        maxPrice: parseFloat(symbol.priceFilter.maxPrice)
                    }));
                allSymbols = [...allSymbols, ...symbols];
            }
        }

        console.log(`获取到 ${allSymbols.length} 个合约交易对`);
        return allSymbols;
    } catch (error) {
        console.error('获取交易对失败:', error.message);
        return [];
    }
}

/**
 * 初始化WebSocket连接和订阅
 */
function initializeWebSocket(symbols) {
    wsClient.connect();

    for (const symbolData of symbols) {
        const params = {
            op: 'subscribe',
            args: [`kline.1h.${symbolData.symbol}`]
        };

        wsClient.subscribe(params, (data) => {
            if (Array.isArray(data)) {
                const klines = data.map(kline => ({
                    symbol: symbolData.symbol,
                    openTime: kline.start,
                    open: parseFloat(kline.open),
                    high: parseFloat(kline.high),
                    low: parseFloat(kline.low),
                    close: parseFloat(kline.close),
                    volume: parseFloat(kline.volume),
                    closeTime: kline.end,
                    turnover: parseFloat(kline.turnover)
                }));

                klineCache.set(symbolData.symbol, klines);
            }
        });
    }
}

/**
 * 获取指定交易对的K线数据
 */
async function getKlines(symbol, interval = '60', limit = 20) {
    try {
        // 首先检查缓存
        if (klineCache.has(symbol)) {
            const cachedKlines = klineCache.get(symbol);
            if (cachedKlines.length >= limit) {
                return cachedKlines.slice(-limit);
            }
        }

        // 如果缓存不可用，则通过REST API获取
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

        const klines = response.data.result.list.map(kline => ({
            openTime: parseInt(kline[0]),
            open: parseFloat(kline[1]),
            high: parseFloat(kline[2]),
            low: parseFloat(kline[3]),
            close: parseFloat(kline[4]),
            volume: parseFloat(kline[5]),
            closeTime: parseInt(kline[0]) + parseInt(interval) * 60 * 1000,
            symbol: symbol
        })).reverse();

        // 更新缓存
        klineCache.set(symbol, klines);
        return klines;
    } catch (error) {
        console.error(`获取 ${symbol} K线数据失败:`, error.message);
        return [];
    }
}

module.exports = {
    getAllSymbols,
    getKlines,
    initializeWebSocket
};
