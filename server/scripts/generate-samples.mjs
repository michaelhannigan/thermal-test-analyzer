// Generates two synthetic thermal imaging effectiveness test logs:
//   run-a-baseline.csv  - healthy reference run
//   run-b-candidate.csv - regressed run (sensor soak, SNR drop, latency spikes)
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "sample-data");
mkdirSync(outDir, { recursive: true });

const HEADER = [
  "timestamp",
  "frame_id",
  "target_id",
  "range_m",
  "ambient_temp_c",
  "target_temp_c",
  "delta_t_c",
  "snr_db",
  "netd_mk",
  "detection_confidence",
  "detected",
  "classified",
  "classification_latency_ms",
  "track_error_m",
  "sensor_temp_c",
  "frame_rate_hz",
  "dropped_frame",
].join(",");

// Deterministic PRNG so samples are reproducible.
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TARGETS = ["UAS-01", "UAS-02", "GND-VEH-01", "PERSON-01"];

function generate({ seed, frames, regressed }) {
  const rnd = mulberry32(seed);
  const gauss = () => (rnd() + rnd() + rnd() + rnd() - 2) / 2; // approx N(0,1)
  const rows = [HEADER];
  const startMs = Date.UTC(2026, 4, 20, 14, 0, 0);
  const fps = 30;

  for (let i = 0; i < frames; i++) {
    const t = startMs + Math.round((i / fps) * 1000);
    const progress = i / frames;
    const target = TARGETS[i % TARGETS.length];

    // Sensor thermal soak: candidate run overheats faster.
    const soak = regressed ? 18 * progress : 7 * progress;
    const sensorTemp = 28 + soak + gauss() * 0.8;

    // Higher sensor temp raises the noise floor (NETD) and lowers SNR.
    const netdBase = regressed ? 28 : 22;
    const netd = Math.max(8, netdBase + Math.max(0, sensorTemp - 45) * 1.6 + gauss() * 3);

    const range = 300 + Math.abs(gauss()) * 900;
    const ambient = 19 + gauss() * 0.5;
    const deltaT = Math.max(0.3, (regressed ? 2.6 : 3.4) - range / 2000 + gauss() * 0.6);
    const targetTemp = ambient + deltaT;

    let snr = (regressed ? 10.5 : 13.5) + deltaT * 1.5 - (netd - 22) * 0.12 + gauss() * 1.3;
    // Inject a low-SNR dropout segment in the candidate run.
    if (regressed && i > frames * 0.55 && i < frames * 0.62) snr -= 8;
    snr = Math.max(0.5, snr);

    const detectProb = Math.min(0.999, Math.max(0, (snr - 2) / 12));
    let detected = rnd() < detectProb ? 1 : 0;
    // Candidate run: occasional close-range false negatives.
    if (regressed && range < 700 && deltaT > 2 && rnd() < 0.04) detected = 0;

    const confidence = detected ? Math.min(0.99, Math.max(0.4, detectProb + gauss() * 0.05)) : Math.max(0, 0.2 + gauss() * 0.1);
    const classified = detected && confidence > 0.6 ? 1 : 0;

    let latency = (regressed ? 42 : 31) + Math.max(0, gauss() * 6);
    // Latency spikes under thermal load in the candidate run.
    if (regressed && rnd() < 0.02) latency += 60 + rnd() * 80;

    const trackError = detected ? Math.abs(gauss()) * (regressed ? 1.6 : 0.9) : 0;
    const dropped = (regressed ? rnd() < 0.03 : rnd() < 0.004) ? 1 : 0;
    const frameRate = dropped ? fps - 6 - rnd() * 5 : fps + gauss() * 0.3;

    rows.push(
      [
        t,
        i,
        target,
        range.toFixed(1),
        ambient.toFixed(2),
        targetTemp.toFixed(2),
        deltaT.toFixed(2),
        snr.toFixed(2),
        netd.toFixed(1),
        confidence.toFixed(3),
        detected,
        classified,
        latency.toFixed(1),
        trackError.toFixed(2),
        sensorTemp.toFixed(2),
        frameRate.toFixed(1),
        dropped,
      ].join(","),
    );
  }
  return rows.join("\n") + "\n";
}

writeFileSync(join(outDir, "run-a-baseline.csv"), generate({ seed: 42, frames: 1800, regressed: false }));
writeFileSync(join(outDir, "run-b-candidate.csv"), generate({ seed: 7, frames: 1800, regressed: true }));
console.log("Sample data written to", outDir);
