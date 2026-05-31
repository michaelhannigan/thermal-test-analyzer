import { parse } from "csv-parse/sync";
import type { FrameRecord } from "./types.js";

// Canonical column names. The parser is tolerant of header aliases and ordering.
const ALIASES: Record<keyof FrameRecord, string[]> = {
  timestamp: ["timestamp", "time", "ts", "time_ms"],
  frameId: ["frame_id", "frame", "frameid"],
  targetId: ["target_id", "target", "targetid"],
  rangeM: ["range_m", "range", "distance_m", "distance"],
  ambientTempC: ["ambient_temp_c", "ambient_temp", "ambient", "background_temp_c"],
  targetTempC: ["target_temp_c", "target_temp"],
  deltaTC: ["delta_t_c", "delta_t", "thermal_contrast_c", "dt_c"],
  snrDb: ["snr_db", "snr"],
  netdMk: ["netd_mk", "netd", "noise_equiv_temp_diff_mk"],
  detectionConfidence: ["detection_confidence", "confidence", "conf"],
  detected: ["detected", "is_detected", "detection"],
  classified: ["classified", "is_classified", "classification"],
  classificationLatencyMs: ["classification_latency_ms", "latency_ms", "class_latency_ms"],
  trackErrorM: ["track_error_m", "track_error", "tracking_error_m"],
  sensorTempC: ["sensor_temp_c", "sensor_temp", "core_temp_c"],
  frameRateHz: ["frame_rate_hz", "fps", "framerate"],
  droppedFrame: ["dropped_frame", "dropped", "frame_dropped"],
};

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, "_");
}

function buildColumnMap(headers: string[]): Record<keyof FrameRecord, number> {
  const normalized = headers.map(normalizeHeader);
  const map = {} as Record<keyof FrameRecord, number>;
  for (const key of Object.keys(ALIASES) as (keyof FrameRecord)[]) {
    const idx = normalized.findIndex((h) => ALIASES[key].includes(h));
    map[key] = idx;
  }
  return map;
}

function toBool(v: string | undefined): boolean {
  if (v === undefined) return false;
  const s = v.trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "y";
}

function toNum(v: string | undefined, fallback = 0): number {
  if (v === undefined || v.trim() === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export interface ParseResult {
  frames: FrameRecord[];
  warnings: string[];
}

export function parseCsv(content: string): ParseResult {
  const rows: string[][] = parse(content, {
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });

  if (rows.length === 0) {
    throw new Error("CSV is empty");
  }

  const headers = rows[0];
  const colMap = buildColumnMap(headers);
  const warnings: string[] = [];

  const required: (keyof FrameRecord)[] = ["snrDb", "detectionConfidence", "detected"];
  for (const key of required) {
    if (colMap[key] === -1) {
      warnings.push(`Missing recommended column for "${key}"; defaulting to 0/false.`);
    }
  }

  // Detect whether timestamp looks like seconds vs milliseconds for duration math.
  const frames: FrameRecord[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const get = (key: keyof FrameRecord): string | undefined => {
      const idx = colMap[key];
      return idx >= 0 ? row[idx] : undefined;
    };

    let ts = toNum(get("timestamp"), i);
    // Normalize seconds-based timestamps to ms.
    if (ts > 0 && ts < 1e11) ts = ts * 1000;

    const ambient = toNum(get("ambientTempC"));
    const target = toNum(get("targetTempC"));
    const dtRaw = get("deltaTC");
    const deltaT = dtRaw !== undefined && dtRaw.trim() !== "" ? toNum(dtRaw) : target - ambient;

    frames.push({
      timestamp: ts,
      frameId: Math.round(toNum(get("frameId"), i)),
      targetId: (get("targetId") ?? `T-${i}`).toString(),
      rangeM: toNum(get("rangeM")),
      ambientTempC: ambient,
      targetTempC: target,
      deltaTC: deltaT,
      snrDb: toNum(get("snrDb")),
      netdMk: toNum(get("netdMk")),
      detectionConfidence: toNum(get("detectionConfidence")),
      detected: toBool(get("detected")),
      classified: toBool(get("classified")),
      classificationLatencyMs: toNum(get("classificationLatencyMs")),
      trackErrorM: toNum(get("trackErrorM")),
      sensorTempC: toNum(get("sensorTempC")),
      frameRateHz: toNum(get("frameRateHz")),
      droppedFrame: toBool(get("droppedFrame")),
    });
  }

  if (frames.length === 0) {
    throw new Error("CSV contained headers but no data rows");
  }

  return { frames, warnings };
}
