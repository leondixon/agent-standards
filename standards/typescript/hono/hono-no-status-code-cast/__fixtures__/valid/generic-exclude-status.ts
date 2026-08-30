export function narrowErrorStatus<TStatus extends number>(
  status: TStatus,
): Exclude<TStatus, 200 | 201> {
  return status as Exclude<TStatus, 200 | 201>;
}
