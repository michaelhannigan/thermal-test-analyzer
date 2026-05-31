import { randomUUID } from "node:crypto";
import { analyzeRun } from "./analysis/analyze.js";
import { parseCsv } from "./parser.js";
import type { StoredRun } from "./types.js";

// Simple in-memory run store. Swap for a DB-backed implementation if persistence is needed.
class RunStore {
  private runs = new Map<string, StoredRun>();

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
    return { run, warnings };
  }

  get(id: string): StoredRun | undefined {
    return this.runs.get(id);
  }

  setSummary(id: string, summary: string): void {
    const run = this.runs.get(id);
    if (run) run.aiSummary = summary;
  }

  list(): StoredRun[] {
    return [...this.runs.values()].sort((a, b) => b.createdAt - a.createdAt);
  }

  delete(id: string): boolean {
    return this.runs.delete(id);
  }
}

export const store = new RunStore();
