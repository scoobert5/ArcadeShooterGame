import { GameState } from '../core/GameState';
import { Colors } from '../utils/constants';

export class GameRenderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
  }

  render(state: GameState) {
    this.clear();

    // Render Entities
    const entities = state.entityManager.getAll();
    for (const entity of entities) {
      this.drawEntity(entity);
    }
    
    // Debug/Temp text
    if (state.status !== 'playing') {
        // Overlay handling usually happens in React, but simple effects can be here
    }
  }

  private clear() {
    this.ctx.fillStyle = Colors.Background;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawEntity(entity: any) {
    this.ctx.fillStyle = entity.color || '#fff';
    this.ctx.beginPath();
    this.ctx.arc(entity.position.x, entity.position.y, entity.radius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.closePath();
  }
  
  resize(width: number, height: number) {
      this.width = width;
      this.height = height;
  }
}