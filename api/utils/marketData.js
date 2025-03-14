const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

const BASE_URL = 'https://api.bybit.com';

// 添加生成签名的函数
function generateSignature(parameters, timestamp, apiSecret) {
    const orderedParams = Object.keys(parameters)
        .sort()
        .reduce((obj, key) => {
            obj[key] = parameters[key];
            return obj;
        }, {});

    const queryString = Object.entries(orderedParams)
        .map(([key, value]) => `${key}=${value}`)
        .join('&');

    return crypto
        .createHmac('sha256', apiSecret)
        .update(timestamp + process.env.BYBIT_API_KEY + queryString)
        .digest('hex');
}

// 添加请求头生成函数
function getHeaders(parameters = {}) {
    const timestamp = Date.now().toString();
    const signature = generateSignature(parameters, timestamp, process.env.BYBIT_API_SECRET);

    return {
        'X-BAPI-API-KEY': process.env.BYBIT_API_KEY,
        'X-BAPI-SIGN': signature,
        'X-BAPI-TIMESTAMP': timestamp,
        'X-BAPI-RECV-WINDOW': '5000'
    };
}

async function getAllSymbols() {
    try {
        const categories = ['linear', 'inverse'];
        let allSymbols = [];

        for (const category of categories) {
            const params = { category };
            const headers = getHeaders(params);
            
            const response = await axios.get(`${BASE_URL}/v5/market/instruments-info`, {
                params,
                headers
            });

            if (response.data.result && response.data.result.list) {
                const symbols = response.data.result.list
                    .filter(symbol => symbol.status === 'Trading')
                    .map(symbol => ({
                        symbol: symbol.symbol,
                        type: category,
                        underlying: symbol.baseCoin,
                        quoteCoin: symbol.quoteCoin
                    }));
                allSymbols = [...allSymbols, ...symbols];
            }
        }

        return allSymbols;
    } catch (error) {
        console.error('获取交易对失败:', error.message);
        throw error;
    }
}

async function getKlines(symbol, interval = '60', limit = 20) {
    try {
        const params = {
            category: 'linear',
            symbol,
            interval,
            limit
        };
        const headers = getHeaders(params);

        const response = await axios.get(`${BASE_URL}/v5/market/kline`, {
            params,
            headers
        });

        if (!response.data.result || !response.data.result.list) {
            return [];
        }

        return response.data.result.list.map(kline => ({
            openTime: parseInt(kline[0]),
            open: parseFloat(kline[1]),
            high: parseFloat(kline[2]),
            low: parseFloat(kline[3]),
            close: parseFloat(kline[4]),
            volume: parseFloat(kline[5]),
            closeTime: parseInt(kline[0]) + parseInt(interval) * 60 * 1000,
            symbol: symbol
        })).reverse();
    } catch (error) {
        console.error(`获取 ${symbol} K线数据失败:`, error.message);
        throw error;
    }
}

module.exports = {
    getAllSymbols,
    getKlines
};
