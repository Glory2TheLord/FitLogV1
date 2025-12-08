/**
 * Helper function to create user-scoped AsyncStorage keys
 * @param baseKey - The base storage key (e.g., 'fitlog_workouts_v1')
 * @param userId - The current user's ID
 * @returns A user-scoped storage key (e.g., 'fitlog_workouts_v1_user_jade')
 */
export function getUserScopedKey(baseKey: string, userId?: string | null): string {
  if (!userId) {
    // Fall back to base key when no user is selected
    // This prevents crashes but ideally we always have a user
    return baseKey;
  }
  return `${baseKey}_user_${userId}`;
}
