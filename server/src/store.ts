import { randomUUID } from "node:crypto";
import { analyzeRun } from "./analysis/analyze.js";
import { parseCsv } from "./parser.js";
import type { BaselineState, IntelligenceReport, StoredRun } from "./types.js";

// Simple in-memory run store. Swap for a DB-backed implementation if persistence is needed.
class RunStore {
  private runs = new Map<string, StoredRun>();
  private baselineId: string | null = null;
  private baselineLockedAt = 0;

  create(name: string, csv: string): { run: StoredRun; warnings: string[] } {
    const { frames, warnings } = parseCsv(csv);
    const analysis = analyzeRun(frames);
    const run: StoredRun = {
      id: randomUUID(),
      name,
      createdAt: Date.now(),
      frames,
      analysis,
    };
    this.runs.set(run.id, run);
    // Auto-seed the first run as the baseline; later runs only replace it via promotion.
    if (this.baselineId === null) this.setBaseline(run.id);
    return { run, warnings };
  }

  getBaseline(): BaselineState | null {
    if (!this.baselineId) return null;
    const run = this.runs.get(this.baselineId);
    if (!run) {
      this.baselineId = null;
      return null;
    }
    return { runId: run.id, name: run.name, createdAt: run.createdAt, lockedAt: this.baselineLockedAt };
  }

  setBaseline(id: string): BaselineState | null {
    if (!this.runs.has(id)) return null;
    this.baselineId = id;
    this.baselineLockedAt = Date.now();
    return this.getBaseline();
  }

  get(id: string): StoredRun | undefined {
    return this.runs.get(id);
  }

  setReport(id: string, report: IntelligenceReport): void {
    const run = this.runs.get(id);
    if (run) run.aiReport = report;
  }

  list(): StoredRun[] {
    return [...this.runs.values()].sort((a, b) => b.createdAt - a.createdAt);
  }

  delete(id: string): boolean {
    const removed = this.runs.delete(id);
    if (removed && this.baselineId === id) {
      this.baselineId = null;
      this.baselineLockedAt = 0;
    }
    return removed;
  }
}

export const store = new RunStore();
