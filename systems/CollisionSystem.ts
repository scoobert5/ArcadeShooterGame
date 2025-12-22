import { System } from './BaseSystem';
import { GameState } from '../core/GameState';

export class CollisionSystem implements System {
  update(dt: number, state: GameState) {
    // TODO: Check Projectile vs Enemy collisions
    // TODO: Check Enemy vs Player collisions
    // TODO: Apply damage and remove entities
  }
}