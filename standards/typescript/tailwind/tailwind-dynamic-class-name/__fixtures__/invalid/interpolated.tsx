export function Tone({ severity }: { severity: string }) {
  return <div className={`text-${severity}`} />;
}
