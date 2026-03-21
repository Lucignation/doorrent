import type { ChartPoint } from "../../types/app";

const palette = {
  forest: "var(--accent)",
  blue: "var(--blue)",
  gold: "var(--accent2)",
  rose: "var(--red)",
};

interface BarChartProps {
  data: ChartPoint[];
  accent?: keyof typeof palette;
}

export default function BarChart({
  data,
  accent = "forest",
}: BarChartProps) {
  const maxValue = Math.max(...data.map((item) => item.value), 1);
  const color = palette[accent] || palette.forest;

  return (
    <div className="chart-container">
      <div className="bar-chart">
      {data.map((item, index) => {
        const height = Math.round((item.value / maxValue) * 140);

        return (
          <div key={`${item.label}-${index}`} className="bar-group">
            <div className="bar-val">{item.display || item.value}</div>
            <div
              className="bar"
              style={{
                height: `${height}px`,
                background: color,
                opacity: index === data.length - 1 ? 1 : 0.72,
              }}
            />
            <div className="bar-label">{item.label}</div>
          </div>
        );
      })}
      </div>
    </div>
  );
}
