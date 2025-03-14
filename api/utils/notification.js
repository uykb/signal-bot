function generateCardMessage(signals) {
  // 按信号类型分组
  const bullishSignals = signals.filter(s => s.type === '看涨信号');
  const bearishSignals = signals.filter(s => s.type === '看跌信号');
  
  // 生成看涨信号数据
  const bullishData = bullishSignals.map(signal => ({
    elements: [
      {
        tag: "column_set",
        horizontal_spacing: "8px",
        horizontal_align: "left",
        columns: [
          {
            tag: "column",
            width: "weighted",
            elements: [{
              tag: "markdown",
              content: signal.details.symbol,
              text_align: "center"
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
              content: signal.details.price.toString(),
              text_align: "center"
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
              content: signal.details.volumeRatio,
              text_align: "center"
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
              content: signal.details.type,
              text_align: "center"
            }],
            vertical_align: "top",
            vertical_spacing: "8px",
            weight: 1
          }
        ]
      }
    ]
  }));

  // 生成看跌信号数据，格式与看涨信号相同
  const bearishData = bearishSignals.map(signal => ({
    elements: [
      {
        tag: "column_set",
        horizontal_spacing: "8px",
        horizontal_align: "left",
        columns: [
          {
            tag: "column",
            width: "weighted",
            elements: [{
              tag: "markdown",
              content: signal.details.symbol,
              text_align: "center"
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
              content: signal.details.price.toString(),
              text_align: "center"
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
              content: signal.details.volumeRatio,
              text_align: "center"
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
              content: signal.details.type,
              text_align: "center"
            }],
            vertical_align: "top",
            vertical_spacing: "8px",
            weight: 1
          }
        ]
      }
    ]
  }));

  // 获取最新信号的时间
  const latestSignal = signals[signals.length - 1];
  const times = formatTimes(new Date(latestSignal.time));

  return {
    msg_type: "interactive",
    card: {
      elements: [
        // 看涨信号部分
        ...(bullishSignals.length > 0 ? [
          {
            tag: "markdown",
            content: "📈 看涨信号",
            text_align: "left"
          },
          {
            tag: "column_set",
            background_style: "grey",
            horizontal_spacing: "8px",
            columns: [
              {
                tag: "column",
                width: "weighted",
                elements: [{
                  tag: "markdown",
                  content: "**交易对**",
                  text_align: "center"
                }],
                weight: 1
              },
              {
                tag: "column",
                width: "weighted",
                elements: [{
                  tag: "markdown",
                  content: "**价格**",
                  text_align: "center"
                }],
                weight: 1
              },
              {
                tag: "column",
                width: "weighted",
                elements: [{
                  tag: "markdown",
                  content: "**成交量比率**",
                  text_align: "center"
                }],
                weight: 1
              },
              {
                tag: "column",
                width: "weighted",
                elements: [{
                  tag: "markdown",
                  content: "**合约类型**",
                  text_align: "center"
                }],
                weight: 1
              }
            ]
          },
          ...bullishData
        ] : []),

        // 看跌信号部分
        ...(bearishSignals.length > 0 ? [
          {
            tag: "markdown",
            content: "📉 看跌信号",
            text_align: "left"
          },
          {
            tag: "column_set",
            background_style: "grey",
            horizontal_spacing: "8px",
            columns: [
              {
                tag: "column",
                width: "weighted",
                elements: [{
                  tag: "markdown",
                  content: "**交易对**",
                  text_align: "center"
                }],
                weight: 1
              },
              {
                tag: "column",
                width: "weighted",
                elements: [{
                  tag: "markdown",
                  content: "**价格**",
                  text_align: "center"
                }],
                weight: 1
              },
              {
                tag: "column",
                width: "weighted",
                elements: [{
                  tag: "markdown",
                  content: "**成交量比率**",
                  text_align: "center"
                }],
                weight: 1
              },
              {
                tag: "column",
                width: "weighted",
                elements: [{
                  tag: "markdown",
                  content: "**合约类型**",
                  text_align: "center"
                }],
                weight: 1
              }
            ]
          },
          ...bearishData
        ] : []),

        // 底部时间信息
        {
          tag: "note",
          elements: [
            {
              tag: "plain_text",
              content: `UTC时间: ${times.utc} | 北京时间: ${times.beijing}`
            }
          ]
        }
      ],
      header: {
        template: "blue",
        title: {
          content: `📶 交易信号 (共${signals.length}个)`,
          tag: "plain_text"
        }
      }
    }
  };
}
