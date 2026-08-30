export async function hasPermission(userId: string, permission: string): Promise<boolean> {
  return userId.length > 0 && permission.length > 0;
}
