import { System } from './BaseSystem';
import { GameState, GameStatus } from '../core/GameState';

export class ProgressionSystem implements System {
  update(dt: number, state: GameState) {
    // TODO: Check if Player is dead -> Set status to GameOver
    // TODO: Check if Wave is cleared -> Increment Wave -> Spawn new batch
    // TODO: Update Score Multipliers
  }
}