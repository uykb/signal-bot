# OKX交易信号机器人

基于OKX API的加密货币交易信号提醒机器人，支持实时K线分析和飞书通知。

## 功能特点

- 支持所有OKX合约交易对
- 实时WebSocket数据订阅
- K线针形态识别
- 成交量分析
- 飞书消息通知

## 部署步骤

1. 克隆仓库
2. 复制 `.env.example` 为 `.env` 并填写配置
3. 在Vercel上部署

## 环境变量

- `OKX_API_KEY`: OKX API密钥
- `OKX_API_SECRET`: OKX API密钥
- `FEISHU_WEBHOOK_URL`: 飞书Webhook地址
- `VOLUME_THRESHOLD`: 成交量阈值（默认1.5）
- `PIN_BAR_RATIO`: 针形态比率（默认1.5）
- `LOOKBACK_PERIOD`: 回溯周期（默认10）

## 开发

```bash
npm install
npm run dev
