export type ScoreResult
  = | { ok: true }
    | { ok: false; error: string };
