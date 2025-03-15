const axios = require('axios');
require('dotenv').config();

/**
 * 发送消息到飞书
 */
async function sendToFeishu(signal) {
  const webhookUrl = process.env.FEISHU_WEBHOOK_URL;
  
  if (!webhookUrl) {
    console.error('飞书Webhook URL未设置');
    return false;
  }
  
  try {
    // 构建飞书消息卡片
    const message = {
    msg_type: "interactive",
    card: {
      elements: [
        {
          tag: "div",
          text: {
            content: `**交易对**: ${signal.details.symbol}\n**价格**: ${signal.details.price}\n**成交量比率**: ${signal.details.volumeRatio}\n**合约类型**: ${signal.details.type}\n**标的资产**: ${signal.details.underlying}\n**K线周期**: ${process.env.KLINE_INTERVAL || '15m'}`,
            tag: "lark_md"
          }
        },
          {
            tag: "hr"
          },
          {
            tag: "note",
            elements: [
              {
                tag: "plain_text",
                content: `信号时间: ${signal.time}`
              }
            ]
          }
        ],
        header: {
          template: signal.type === "看涨信号" ? "green" : "red",
          title: {
            content: `${signal.type} - ${signal.details.symbol}`,
            tag: "plain_text"
          }
        }
      }
    };
    
    await axios.post(webhookUrl, message);
    console.log(`已发送 ${signal.details.symbol} ${signal.type} 到飞书`);
    return true;
  } catch (error) {
    console.error('发送飞书消息失败:', error.message);
    return false;
  }
}

module.exports = {
  sendToFeishu
};
