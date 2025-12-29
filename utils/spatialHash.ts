import { GameEntity } from '../entities/types';

export class SpatialHashGrid {
  private cellSize: number;
  private grid: Map<string, GameEntity[]>;

  constructor(cellSize: number) {
    this.cellSize = cellSize;
    this.grid = new Map();
  }

  /**
   * Clears the grid for the next frame.
   */
  clear() {
    this.grid.clear();
  }

  /**
   * Inserts an entity into the grid cells it overlaps.
   */
  insert(entity: GameEntity) {
    const { x, y } = entity.position;
    const r = entity.radius;

    // Calculate range of cells this entity overlaps
    const startX = Math.floor((x - r) / this.cellSize);
    const endX = Math.floor((x + r) / this.cellSize);
    const startY = Math.floor((y - r) / this.cellSize);
    const endY = Math.floor((y + r) / this.cellSize);

    for (let cx = startX; cx <= endX; cx++) {
      for (let cy = startY; cy <= endY; cy++) {
        const key = `${cx},${cy}`;
        if (!this.grid.has(key)) {
          this.grid.set(key, []);
        }
        this.grid.get(key)!.push(entity);
      }
    }
  }

  /**
   * Returns potential candidates for collision near the given position and radius.
   * Returns a deduplicated Set of entities.
   */
  query(x: number, y: number, radius: number): Set<GameEntity> {
    const candidates = new Set<GameEntity>();
    
    const startX = Math.floor((x - radius) / this.cellSize);
    const endX = Math.floor((x + radius) / this.cellSize);
    const startY = Math.floor((y - radius) / this.cellSize);
    const endY = Math.floor((y + radius) / this.cellSize);

    for (let cx = startX; cx <= endX; cx++) {
      for (let cy = startY; cy <= endY; cy++) {
        const key = `${cx},${cy}`;
        const cell = this.grid.get(key);
        if (cell) {
          for (const entity of cell) {
            candidates.add(entity);
          }
        }
      }
    }

    return candidates;
  }
}