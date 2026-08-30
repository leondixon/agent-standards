export function hasDob(value: Date | null | undefined): boolean {
  return value !== null && value !== undefined;
}
