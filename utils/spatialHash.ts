
import { GameEntity } from '../entities/types';

export class SpatialHashGrid {
  private cellSize: number;
  private grid: Map<number, GameEntity[]>;
  private currentQueryId: number = 0;

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
   * Generates a unique integer key for a cell coordinate.
   * Assumes coordinates fit within 16-bit signed integers (-32768 to 32767).
   * Since grid cells are large (64px), this supports a world size of ~4 million pixels, plenty.
   */
  private getKey(x: number, y: number): number {
    return (x & 0xFFFF) | ((y & 0xFFFF) << 16);
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
        const key = this.getKey(cx, cy);
        let cell = this.grid.get(key);
        if (!cell) {
          cell = [];
          this.grid.set(key, cell);
        }
        cell.push(entity);
      }
    }
  }

  /**
   * Returns potential candidates for collision near the given position and radius.
   * Appends candidates to the provided results array.
   * Uses internal _queryId on entities to prevent duplicates without creating a Set.
   */
  query(x: number, y: number, radius: number, results: GameEntity[]) {
    this.currentQueryId++;
    
    const startX = Math.floor((x - radius) / this.cellSize);
    const endX = Math.floor((x + radius) / this.cellSize);
    const startY = Math.floor((y - radius) / this.cellSize);
    const endY = Math.floor((y + radius) / this.cellSize);

    for (let cx = startX; cx <= endX; cx++) {
      for (let cy = startY; cy <= endY; cy++) {
        const key = this.getKey(cx, cy);
        const cell = this.grid.get(key);
        if (cell) {
          for (let i = 0; i < cell.length; i++) {
            const entity = cell[i];
            if (entity._queryId !== this.currentQueryId) {
              entity._queryId = this.currentQueryId;
              results.push(entity);
            }
          }
        }
      }
    }
  }
}
