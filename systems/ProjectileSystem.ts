import { System } from './BaseSystem';
import { GameState } from '../core/GameState';

export class ProjectileSystem implements System {
  update(dt: number, state: GameState) {
    // TODO: Move projectiles based on velocity
    // TODO: Remove expired projectiles
  }
}