import { System } from './BaseSystem';
import { GameState } from '../core/GameState';

export class ProgressionSystem implements System {
  update(dt: number, state: GameState) {
    // TODO: Track wave timer
    // TODO: Spawn enemies based on difficulty
    // TODO: Handle Level Up / Upgrades
  }
}