const axios = require('axios');
require('dotenv').config();

/**
 * 格式化UTC和北京时间
 */
function formatTimes(date) {
  const utcTime = date.toLocaleString('zh-CN', { 
    timeZone: 'UTC',
    hour12: false 
  });
  
  const beijingTime = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const bjTime = beijingTime.toLocaleString('zh-CN', { 
    timeZone: 'Asia/Shanghai',
    hour12: false 
  });
  
  return {
    utc: utcTime,
    beijing: bjTime
  };
}

/**
 * 生成飞书卡片消息
 */
function generateCardMessage(signals) {
  // 按信号类型分组
  const bullishSignals = signals.filter(s => s.type === '看涨信号');
  const bearishSignals = signals.filter(s => s.type === '看跌信号');
  
  // 生成看涨信号数据
  const bullishData = bullishSignals.map(signal => ({
    a: signal.details.symbol,
    b: signal.details.price.toString(),
    c: signal.details.volumeRatio,
    d: signal.details.type
  }));
  
  // 生成看跌信号数据
  const bearishData = bearishSignals.map(signal => ({
    a: signal.details.symbol,
    b: signal.details.price.toString(),
    c: signal.details.volumeRatio,
    d: signal.details.type
  }));
  
  // 获取最新信号的时间
  const latestSignal = signals[signals.length - 1];
  const times = formatTimes(new Date(latestSignal.time));
  
  // 使用飞书卡片模板
  return {
    config: {
      update_multi: true
    },
    i18n_elements: {
      zh_cn: [
        {
          tag: "markdown",
          content: "📈看涨信号",
          text_align: "left",
          text_size: "normal"
        },
        {
          tag: "column_set",
          background_style: "grey",
          horizontal_spacing: "8px",
          horizontal_align: "left",
          columns: [
            {
              tag: "column",
              width: "weighted",
              elements: [{
                tag: "markdown",
                content: "**交易对**",
                text_align: "center",
                text_size: "normal"
              }],
              vertical_align: "top",
              vertical_spacing: "8px",
              weight: 1
            },
            {
              tag: "column",
              width: "weighted",
              elements: [{
                tag: "markdown",
                content: "**价格**",
                text_align: "center",
                text_size: "normal"
              }],
              vertical_align: "top",
              vertical_spacing: "8px",
              weight: 1
            },
            {
              tag: "column",
              width: "weighted",
              elements: [{
                tag: "markdown",
                content: "**成交量比率**",
                text_align: "center",
                text_size: "normal"
              }],
              vertical_align: "top",
              vertical_spacing: "8px",
              weight: 1
            },
            {
              tag: "column",
              width: "weighted",
              elements: [{
                tag: "markdown",
                content: "**合约类型**",
                text_align: "center",
                text_size: "normal"
              }],
              vertical_align: "top",
              vertical_spacing: "8px",
              weight: 1
            }
          ]
        },
        {
          tag: "repeat",
          variable: "group_table",
          elements: bullishData
        },
        {
          tag: "markdown",
          content: "📉 看跌信号",
          text_align: "left",
          text_size: "normal"
        },
        {
          tag: "column_set",
          background_style: "grey",
          horizontal_spacing: "8px",
          horizontal_align: "left",
          columns: [
            {
              tag: "column",
              width: "weighted",
              elements: [{
                tag: "markdown",
                content: "**交易对**",
                text_align: "center",
                text_size: "normal"
              }],
              vertical_align: "top",
              vertical_spacing: "8px",
              weight: 1
            },
            {
              tag: "column",
              width: "weighted",
              elements: [{
                tag: "markdown",
                content: "**价格**",
                text_align: "center",
                text_size: "normal"
              }],
              vertical_align: "top",
              vertical_spacing: "8px",
              weight: 1
            },
            {
              tag: "column",
              width: "weighted",
              elements: [{
                tag: "markdown",
                content: "**成交量比率**",
                text_align: "center",
                text_size: "normal"
              }],
              vertical_align: "top",
              vertical_spacing: "8px",
              weight: 1
            },
            {
              tag: "column",
              width: "weighted",
              elements: [{
                tag: "markdown",
                content: "**合约类型**",
                text_align: "center",
                text_size: "normal"
              }],
              vertical_align: "top",
              vertical_spacing: "8px",
              weight: 1
            }
          ]
        },
        {
          tag: "repeat",
          variable: "group_table",
          elements: bearishData
        },
        {
          tag: "note",
          elements: [
            {
              tag: "standard_icon",
              token: "emoji_outlined"
            },
            {
              tag: "plain_text",
              content: `信号时间: ${times.utc}`
            }
          ]
        }
      ]
    },
    i18n_header: {
      zh_cn: {
        title: {
          tag: "plain_text",
          content: `📶交易信号 (共${signals.length}个)`
        },
        subtitle: {
          tag: "plain_text",
          content: `生成时间：${times.beijing} (北京时间)`
        },
        template: "blue"
      }
    }
  };
}

/**
 * 发送消息到飞书
 */
async function sendToFeishu(signals) {
  const webhookUrl = process.env.FEISHU_WEBHOOK_URL;
  
  if (!webhookUrl) {
    console.error('飞书Webhook URL未设置');
    return false;
  }
  
  try {
    const message = generateCardMessage(signals);
    await axios.post(webhookUrl, message);
    console.log(`已发送 ${signals.length} 个信号到飞书`);
    return true;
  } catch (error) {
    console.error('发送飞书消息失败:', error.message);
    return false;
  }
}

module.exports = {
  sendToFeishu
};
