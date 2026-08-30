export type BureauScoreResult
  = | { ok: true }
    | { ok: false; error: string };
