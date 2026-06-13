import { useRef, useState } from "react";

interface Props {
  onFiles: (files: File[]) => void;
  uploading: boolean;
  label?: string;
}

export function UploadZone({ onFiles, uploading, label }: Props) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) onFiles(files);
  };

  return (
    <div
      onClick={() => !uploading && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      style={{
        border: `2px dashed ${dragging ? "var(--accent)" : "var(--border)"}`,
        borderRadius: "var(--radius)",
        padding: "28px 20px",
        textAlign: "center",
        cursor: uploading ? "default" : "pointer",
        background: dragging ? "rgba(59,130,246,.05)" : "transparent",
        transition: "border-color 0.15s, background 0.15s",
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        multiple
        style={{ display: "none" }}
        onChange={(e) => { const fs = Array.from(e.target.files ?? []); if (fs.length > 0) onFiles(fs); e.target.value = ""; }}
      />
      <div style={{ fontSize: 24, marginBottom: 8 }}>📂</div>
      <div style={{ fontWeight: 600, color: uploading ? "var(--text-muted)" : "var(--text)", marginBottom: 4 }}>
        {uploading ? "Uploading…" : label ?? "Drop one or more thermal test CSVs here"}
      </div>
      <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
        {uploading ? "Parsing and analyzing…" : "or click to browse (multiple allowed)"}
      </div>
    </div>
  );
}
