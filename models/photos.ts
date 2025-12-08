export type PhotoPositionId = 'front' | 'left' | 'right' | 'back' | 'flex';

export type PhotoPosition = {
  id: PhotoPositionId;
  label: string;      // e.g. "Front", "Side", "Back", "Flex"
  imageUri?: string;  // set when a photo is taken
};

export type PhotoDay = {
  dateKey: string;    // e.g. "2025-12-04"
  displayDate: string; // e.g. "Dec 4, 2025"
  positions: PhotoPosition[];
};
