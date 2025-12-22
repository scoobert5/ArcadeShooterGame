import { System } from './BaseSystem';
import { GameState } from '../core/GameState';
import { InputState } from '../core/InputManager';

export class PlayerSystem implements System {
  update(dt: number, state: GameState, input: InputState) {
    if (!state.player) return;

    // TODO: Implement movement logic based on input
    // TODO: Implement shooting logic
  }
}