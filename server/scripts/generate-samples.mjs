// Generates synthetic thermal imaging effectiveness test logs.
//   run-a-baseline.csv  - healthy reference run
//   run-b-candidate.csv - regressed run (sensor soak, SNR drop, latency spikes)
// Plus 10 additional scenarios (run-c .. run-l): ~3 improved/promotable and
// ~7 distinct failure modes for exercising comparison, anomalies, and promotion.
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

// Tunable scenario knobs. Defaults reproduce the healthy baseline run; presets
// override individual knobs to model improvements or specific failure modes.
const BASELINE = {
  frames: 1800,
  soakRate: 7, // sensor thermal soak gain over the run
  netdBase: 22, // noise floor baseline (lower is better)
  snrBase: 13.5, // SNR baseline (higher is better)
  deltaTBase: 3.4, // thermal contrast baseline (higher is better)
  latencyBase: 31, // classification latency baseline (lower is better)
  latencySpikeProb: 0, // per-frame probability of a large latency spike
  dropProb: 0.004, // per-frame dropped-frame probability
  fnProb: 0, // close-range false-negative probability
  snrDropout: 0, // SNR subtracted during a mid-run dropout segment (0 = none)
  trackErrorScale: 0.9, // tracking error magnitude (lower is better)
};

function generate({ seed, ...overrides }) {
  const cfg = { ...BASELINE, ...overrides };
  const frames = cfg.frames;
  const rnd = mulberry32(seed);
  const gauss = () => (rnd() + rnd() + rnd() + rnd() - 2) / 2; // approx N(0,1)
  const rows = [HEADER];
  const startMs = Date.UTC(2026, 4, 20, 14, 0, 0);
  const fps = 30;

  for (let i = 0; i < frames; i++) {
    const t = startMs + Math.round((i / fps) * 1000);
    const progress = i / frames;
    const target = TARGETS[i % TARGETS.length];

    // Sensor thermal soak: higher soakRate overheats faster.
    const soak = cfg.soakRate * progress;
    const sensorTemp = 28 + soak + gauss() * 0.8;

    // Higher sensor temp raises the noise floor (NETD) and lowers SNR.
    const netd = Math.max(8, cfg.netdBase + Math.max(0, sensorTemp - 45) * 1.6 + gauss() * 3);

    const range = 300 + Math.abs(gauss()) * 900;
    const ambient = 19 + gauss() * 0.5;
    const deltaT = Math.max(0.3, cfg.deltaTBase - range / 2000 + gauss() * 0.6);
    const targetTemp = ambient + deltaT;

    let snr = cfg.snrBase + deltaT * 1.5 - (netd - 22) * 0.12 + gauss() * 1.3;
    // Inject a low-SNR dropout segment when configured.
    if (cfg.snrDropout > 0 && i > frames * 0.55 && i < frames * 0.62) snr -= cfg.snrDropout;
    snr = Math.max(0.5, snr);

    const detectProb = Math.min(0.999, Math.max(0, (snr - 2) / 12));
    let detected = rnd() < detectProb ? 1 : 0;
    // Occasional close-range false negatives when configured.
    if (cfg.fnProb > 0 && range < 700 && deltaT > 2 && rnd() < cfg.fnProb) detected = 0;

    const confidence = detected ? Math.min(0.99, Math.max(0.4, detectProb + gauss() * 0.05)) : Math.max(0, 0.2 + gauss() * 0.1);
    const classified = detected && confidence > 0.6 ? 1 : 0;

    let latency = cfg.latencyBase + Math.max(0, gauss() * 6);
    // Latency spikes under thermal load when configured.
    if (cfg.latencySpikeProb > 0 && rnd() < cfg.latencySpikeProb) latency += 60 + rnd() * 80;

    const trackError = detected ? Math.abs(gauss()) * cfg.trackErrorScale : 0;
    const dropped = rnd() < cfg.dropProb ? 1 : 0;
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

// Each scenario maps a file name to generator overrides. The first two reproduce
// the original baseline/candidate runs; run-c..run-l add varied profiles.
const SCENARIOS = [
  ["run-a-baseline.csv", { seed: 42 }],
  [
    "run-b-candidate.csv",
    {
      seed: 7,
      soakRate: 18,
      netdBase: 28,
      snrBase: 10.5,
      deltaTBase: 2.6,
      latencyBase: 42,
      latencySpikeProb: 0.02,
      dropProb: 0.03,
      fnProb: 0.04,
      snrDropout: 8,
      trackErrorScale: 1.6,
    },
  ],
  // --- Improved / promotable (better across the board, no regressions) ---
  [
    "run-c-improved.csv",
    { seed: 101, soakRate: 4, netdBase: 19, snrBase: 16.5, deltaTBase: 3.8, latencyBase: 26, dropProb: 0.001, trackErrorScale: 0.7 },
  ],
  [
    "run-d-improved-marginal.csv",
    { seed: 202, soakRate: 6, netdBase: 21, snrBase: 14.6, deltaTBase: 3.55, latencyBase: 29, dropProb: 0.0008, trackErrorScale: 0.85 },
  ],
  [
    "run-e-improved-cool.csv",
    { seed: 303, soakRate: 3, netdBase: 18, snrBase: 15.6, deltaTBase: 3.7, latencyBase: 27, dropProb: 0.0008, trackErrorScale: 0.75 },
  ],
  // --- Distinct failure modes ---
  ["run-f-sensor-overheat.csv", { seed: 404, soakRate: 26, netdBase: 24 }],
  ["run-g-snr-dropout.csv", { seed: 505, snrBase: 12.5, snrDropout: 9 }],
  ["run-h-latency-spikes.csv", { seed: 606, latencyBase: 40, latencySpikeProb: 0.05 }],
  ["run-i-dropped-frames.csv", { seed: 707, dropProb: 0.08 }],
  ["run-j-close-range-fn.csv", { seed: 808, snrBase: 12.5, deltaTBase: 3.0, fnProb: 0.12 }],
  [
    "run-k-mixed-critical.csv",
    {
      seed: 909,
      soakRate: 22,
      netdBase: 30,
      snrBase: 9.5,
      deltaTBase: 2.4,
      latencyBase: 46,
      latencySpikeProb: 0.04,
      dropProb: 0.05,
      fnProb: 0.06,
      snrDropout: 8,
      trackErrorScale: 1.8,
    },
  ],
  ["run-l-long-duration.csv", { seed: 111, frames: 3600, soakRate: 12, netdBase: 24, snrBase: 12, latencyBase: 36 }],
];

for (const [name, opts] of SCENARIOS) {
  writeFileSync(join(outDir, name), generate(opts));
}
console.log(`Sample data written to ${outDir} (${SCENARIOS.length} files)`);
