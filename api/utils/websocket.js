const WebSocket = require('ws');
const crypto = require('crypto');

class BybitWebSocket {
    constructor() {
        this.ws = null;
        this.pingInterval = null;
        this.subscriptions = new Set();
        this.messageHandlers = new Map();
    }

    connect() {
        this.ws = new WebSocket('wss://stream.bybit.com/v5/public/linear');

        this.ws.on('open', () => {
            console.log('WebSocket连接已建立');
            this.startPing();
            this.resubscribe();
        });

        this.ws.on('message', (data) => {
            const message = JSON.parse(data);
            
            if (message.topic) {
                const handler = this.messageHandlers.get(message.topic);
                if (handler) {
                    handler(message.data);
                }
            }
        });

        this.ws.on('close', () => {
            console.log('WebSocket连接已关闭，尝试重新连接...');
            clearInterval(this.pingInterval);
            setTimeout(() => this.connect(), 5000);
        });

        this.ws.on('error', (error) => {
            console.error('WebSocket错误:', error);
        });
    }

    startPing() {
        this.pingInterval = setInterval(() => {
            if (this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ op: 'ping' }));
            }
        }, 20000);
    }

    subscribe(params, handler) {
        const subscription = JSON.stringify(params);
        this.subscriptions.add(subscription);
        
        if (params.topic) {
            this.messageHandlers.set(params.topic, handler);
        }

        if (this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(subscription);
        }
    }

    resubscribe() {
        for (const subscription of this.subscriptions) {
            if (this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(subscription);
            }
        }
    }

    close() {
        if (this.ws) {
            clearInterval(this.pingInterval);
            this.ws.close();
        }
    }
}

module.exports = BybitWebSocket;
