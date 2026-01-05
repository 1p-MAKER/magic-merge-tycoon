export type ItemTier = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
export type ItemType = 'creature' | 'plant' | 'rock' | 'chest' | 'enemy';

export interface GridItem {
  id: string; // Unique identifier for React keys and logic
  tier: ItemTier;
  type: ItemType;
  isLocked?: boolean; // For initial obstacles
}

export interface GridCell {
  x: number;
  y: number;
  item: GridItem | null;
  isLocked?: boolean; // Land locked by fog
}

export type GridState = GridCell[][];

export const GRID_WIDTH = 5; // Example size
export const GRID_HEIGHT = 5; // Example size

// Helper to create a unique ID
export const generateId = (): string => Math.random().toString(36).substr(2, 9);
