import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TimeSeriesPoint } from "../api.ts";

const CHART_STYLE = {
  background: "var(--surface-2)",
  borderRadius: "var(--radius-sm)",
  padding: "12px 0 4px 0",
};

function TsChart({
  data,
  lines,
  yLabel,
  referenceLines,
}: {
  data: TimeSeriesPoint[];
  lines: { key: keyof TimeSeriesPoint; color: string; name: string }[];
  yLabel: string;
  referenceLines?: { y: number; label: string; color: string }[];
}) {
  return (
    <div style={CHART_STYLE}>
      <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--mono)", paddingLeft: 20, marginBottom: 4, fontWeight: 600 }}>
        {yLabel}
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 4, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis
            dataKey="t"
            tickFormatter={(v: number) => `${v}s`}
            tick={{ fill: "var(--text-dim)", fontSize: 10, fontFamily: "var(--mono)" }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "var(--text-dim)", fontSize: 10, fontFamily: "var(--mono)" }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip
            contentStyle={{
              background: "var(--surface-3)",
              border: "1px solid var(--border)",
              borderRadius: 4,
              fontSize: 11,
              fontFamily: "var(--mono)",
              color: "var(--text)",
            }}
            labelFormatter={(v: number) => `t=${v}s`}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, fontFamily: "var(--mono)", paddingTop: 4 }}
            iconType="circle"
            iconSize={8}
          />
          {referenceLines?.map((rl) => (
            <ReferenceLine key={rl.label} y={rl.y} stroke={rl.color} strokeDasharray="4 2" label={{ value: rl.label, fill: rl.color, fontSize: 10 }} />
          ))}
          {lines.map((l) => (
            <Line
              key={l.key}
              type="monotone"
              dataKey={l.key}
              stroke={l.color}
              name={l.name}
              dot={false}
              strokeWidth={1.5}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TimeSeriesCharts({ data }: { data: TimeSeriesPoint[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <TsChart
        data={data}
        yLabel="SNR (dB)"
        lines={[{ key: "snrDb", color: "#3b82f6", name: "SNR (dB)" }]}
        referenceLines={[{ y: 6, label: "low SNR floor", color: "var(--warning)" }]}
      />
      <TsChart
        data={data}
        yLabel="Detection Confidence"
        lines={[{ key: "detectionConfidence", color: "#10b981", name: "Confidence" }]}
        referenceLines={[{ y: 0.7, label: "0.7", color: "var(--warning)" }]}
      />
      <TsChart
        data={data}
        yLabel="Sensor Temp (°C) / Latency (ms)"
        lines={[
          { key: "sensorTempC", color: "#f59e0b", name: "Sensor Temp °C" },
          { key: "classificationLatencyMs", color: "#a78bfa", name: "Latency ms" },
        ]}
        referenceLines={[{ y: 65, label: "overheat", color: "var(--critical)" }]}
      />
      <TsChart
        data={data}
        yLabel="Thermal Contrast (°C)"
        lines={[{ key: "deltaTC", color: "#f97316", name: "ΔT (°C)" }]}
      />
    </div>
  );
}
