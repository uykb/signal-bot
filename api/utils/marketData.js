const axios = require('axios');
require('dotenv').config();

const BASE_URL = 'https://api.bybit.com';

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
