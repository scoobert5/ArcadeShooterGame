import { System } from './BaseSystem';
import { GameState } from '../core/GameState';

export class EnemySystem implements System {
  update(dt: number, state: GameState) {
    // TODO: Iterate enemies and move them towards player
    // TODO: Handle enemy spawning logic if not in ProgressionSystem
  }
}