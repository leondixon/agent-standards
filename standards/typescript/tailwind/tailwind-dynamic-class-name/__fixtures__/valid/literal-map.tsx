export function Tone({ ok }: { ok: boolean }) {
  return <div className={ok ? 'text-green-600' : 'text-red-600'} />;
}
