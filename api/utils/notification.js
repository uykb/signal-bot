const axios = require('axios');
require('dotenv').config();

/**
 * 转换UTC时间到北京时间
 * @param {Date} date UTC时间
 * @returns {string} 格式化的北京时间字符串
 */
function formatBeijingTime(date) {
  const beijingTime = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  return beijingTime.toLocaleString('zh-CN', { 
    timeZone: 'Asia/Shanghai',
    hour12: false 
  });
}

async function sendToFeishu(signal) {
  const webhookUrl = process.env.FEISHU_WEBHOOK_URL;
  
  if (!webhookUrl) {
    console.error('飞书Webhook URL未设置');
    return false;
  }
  
  try {
    // 转换信号时间为北京时间
    const signalTime = new Date(signal.time);
    const beijingTime = formatBeijingTime(signalTime);

    const message = {
      msg_type: "interactive",
      card: {
        elements: [
          {
            tag: "div",
            text: {
              content: `**交易对**: ${signal.details.symbol}\n**价格**: ${signal.details.price}\n**成交量比率**: ${signal.details.volumeRatio}\n**合约类型**: ${signal.details.type}\n**标的资产**: ${signal.details.underlying}`,
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
                content: `信号时间: ${beijingTime} (北京时间)`
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
