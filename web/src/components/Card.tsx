import type { CSSProperties, ReactNode } from "react";

interface Props {
  title?: string;
  children: ReactNode;
  style?: CSSProperties;
  accent?: string;
}

export function Card({ title, children, style, accent }: Props) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: `1px solid ${accent ?? "var(--border)"}`,
        borderRadius: "var(--radius)",
        overflow: "hidden",
        ...style,
      }}
    >
      {title && (
        <div
          style={{
            padding: "10px 16px",
            borderBottom: "1px solid var(--border)",
            fontSize: 12,
            fontWeight: 600,
            fontFamily: "var(--mono)",
            letterSpacing: "0.08em",
            color: "var(--text-muted)",
            textTransform: "uppercase",
          }}
        >
          {title}
        </div>
      )}
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}
