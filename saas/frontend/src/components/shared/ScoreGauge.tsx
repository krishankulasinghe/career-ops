import ReactECharts from 'echarts-for-react';

interface ScoreGaugeProps {
  score: number;
  size?: number;
}

export function ScoreGauge({ score, size = 200 }: ScoreGaugeProps) {
  const color = score >= 4 ? '#00d27a' : score >= 2.5 ? '#f5803e' : '#e63757';

  const option = {
    series: [
      {
        type: 'gauge',
        startAngle: 180,
        endAngle: 0,
        min: 0,
        max: 5,
        splitNumber: 5,
        radius: '100%',
        progress: { show: true, width: 8 },
        pointer: { show: false },
        axisLine: { lineStyle: { width: 8 } },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        detail: {
          valueAnimation: true,
          formatter: '{value}/5',
          color: 'inherit',
          fontSize: 18,
          fontWeight: 'bold',
          offsetCenter: [0, '-10%'],
        },
        data: [{ value: score, itemStyle: { color } }],
      },
    ],
  };

  return (
    <ReactECharts
      option={option}
      style={{ height: size, width: '100%' }}
      className="score-gauge-canvas"
    />
  );
}
