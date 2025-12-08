export const TRAINING_DAYS = {
  1: 'Chest & Tris',
  2: 'Shoulders',
  3: 'Back & Bis',
  4: 'Legs',
  5: 'Accessories',
} as const;

export type TrainingDayIndex = keyof typeof TRAINING_DAYS;

export function getTrainingDayLabel(index: number): string {
  const map = TRAINING_DAYS as Record<number, string>;
  return map[index] ?? `Day ${index}`;
}
