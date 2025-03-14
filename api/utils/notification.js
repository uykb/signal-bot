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
 * 发送批量信号到飞书
 * @param {Array} signals 信号数组
 */
async function sendToFeishu(signals) {
  const webhookUrl = process.env.FEISHU_WEBHOOK_URL;
  
  if (!webhookUrl) {
    console.error('飞书Webhook URL未设置');
    return false;
  }
  
  try {
    // 按信号类型分组
    const bullishSignals = signals.filter(s => s.type === '看涨信号');
    const bearishSignals = signals.filter(s => s.type === '看跌信号');
    
    // 构建消息卡片
    const message = {
      msg_type: "interactive",
      card: {
        header: {
          template: "blue",
          title: {
            content: `交易信号汇总 (共${signals.length}个)`,
            tag: "plain_text"
          }
        },
        elements: [
          // 看涨信号表格
          ...(bullishSignals.length > 0 ? [
            {
              tag: "div",
              text: {
                content: "🔼 **看涨信号**",
                tag: "lark_md"
              }
            },
            {
              tag: "div",
              text: {
                content: generateTable(bullishSignals, "green"),
                tag: "lark_md"
              }
            }
          ] : []),
          
          // 分隔线
          ...(bullishSignals.length > 0 && bearishSignals.length > 0 ? [{
            tag: "hr"
          }] : []),
          
          // 看跌信号表格
          ...(bearishSignals.length > 0 ? [
            {
              tag: "div",
              text: {
                content: "🔽 **看跌信号**",
                tag: "lark_md"
              }
            },
            {
              tag: "div",
              text: {
                content: generateTable(bearishSignals, "red"),
                tag: "lark_md"
              }
            }
          ] : []),
          
          // 底部时间戳
          {
            tag: "note",
            elements: [
              {
                tag: "plain_text",
                content: `生成时间：${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })} (北京时间)`
              }
            ]
          }
        ]
      }
    };
    
    await axios.post(webhookUrl, message);
    console.log(`已发送 ${signals.length} 个信号到飞书`);
    return true;
  } catch (error) {
    console.error('发送飞书消息失败:', error.message);
    return false;
  }
}

/**
 * 生成信号表格
 */
function generateTable(signals, color) {
  const headers = [
    "交易对",
    "价格",
    "成交量比率",
    "合约类型",
    "标的资产",
    "UTC时间",
    "北京时间"
  ];
  
  const rows = signals.map(signal => {
    const times = formatTimes(new Date(signal.time));
    return [
      `<font color="${color}">${signal.details.symbol}</font>`,
      signal.details.price,
      signal.details.volumeRatio,
      signal.details.type,
      signal.details.underlying,
      times.utc,
      times.beijing
    ];
  });
  
  // 构建markdown表格
  const headerRow = `| ${headers.join(' | ')} |`;
  const separatorRow = `| ${headers.map(() => '---').join(' | ')} |`;
  const dataRows = rows.map(row => `| ${row.join(' | ')} |`).join('\n');
  
  return `${headerRow}\n${separatorRow}\n${dataRows}`;
}

module.exports = {
  sendToFeishu
};
