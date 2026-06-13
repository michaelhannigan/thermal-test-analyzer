# Fun facts

Quirks, curiosities, and surprising-but-true details about the codebase.

## The app documents its own birth

`web/src/data/sdlc.ts` is a faithful, phase-by-phase record of how the app was built by an AI agent — including a tool-usage profile (Edit 64, Create 46, Execute 42, Read 34…) rendered as a chart on the in-app **Summary** tab. The application ships with its own making-of featurette. This wiki's [Lore](lore.md) page draws from it.

## The AI does the math before the model does

Despite five LLM providers, no language model is ever the source of a number. The deterministic intelligence core builds the entire report first; the LLM is handed that draft and may only sharpen wording. If the model returns junk, the draft is used verbatim. The "AI" verdict is reproducible and works with the network unplugged. See [Regression intelligence agent](features/regression-intelligence-agent.md).

## Physics is simulated, not faked

The sample generator (`server/scripts/generate-samples.mjs`) models real thermal coupling: a higher soak rate raises sensor temperature, which raises the NETD noise floor, which lowers SNR, which lowers detection probability. The "fake" data behaves like a real degrading sensor — which is why the anomaly detectors and hypotheses light up plausibly.

## Seeded randomness

Sample data uses a `mulberry32` PRNG with fixed seeds, so `npm run generate-samples` produces byte-identical CSVs every time. Reproducible "randomness" is what makes the fixtures trustworthy for regression demos.

## Twelve scenarios, seven ways to fail

The fixture set isn't just "good vs bad." Beyond a healthy baseline, a regressed candidate, and three flavors of improvement, there are seven distinct failure modes — sensor overheat, SNR dropout, latency spikes, dropped frames, close-range false negatives, a mixed-critical run, and a 3,600-frame long-duration run — each engineered to trip a specific detector.

## A redacted metric key

In `server/src/analysis/compare.ts`, one entry of the `METRICS` array shows its `key` as a run of asterisks in source views — it is a redaction over the real `RunSummary` field (the P95 latency metric). The compare logic still treats it as a normal "lower is better" metric; only the displayed source is masked.

## The mock provider is the smartest one

The `mock` provider isn't a stub returning canned text — it returns the full deterministic SRIA report (verdict, hypotheses, validation steps). It's arguably the most reliable provider in the set, since it never times out, never costs money, and never hallucinates.

## Everything lives in RAM

There is no database. Runs and the baseline sit in a `Map` in `server/src/store.ts`. Restart the server and your entire run history and baseline vanish — a deliberate simplicity tradeoff for a single-session analysis tool.

## OpenRouter pretends to be OpenAI

The OpenRouter backend reuses the OpenAI-compatible chat-completions shape; only the host and two attribution headers (`HTTP-Referer`, `X-Title`) differ (`server/src/ai/llm.ts`). One code path, two providers.

## The first run is special

Whatever you upload first silently becomes the baseline (`server/src/store.ts` auto-seeds it). Every subsequent run is judged against that first upload until you promote a better one.

## A connectivity probe with a sense of brevity

The provider `test()` method sends a tiny prompt — "You are a connectivity probe. Reply with the word OK." — purely to validate credentials without burning tokens on a real analysis.

## There's a smoke test that no longer compiles cleanly

`server/scripts/smoke-test.ts` still calls `summarizeRun`/`summarizeComparison`, methods that were removed when the AI layer became the SRIA. It's a fossil from the pre-intelligence era. See [Cleanup opportunities](cleanup-opportunities.md).
