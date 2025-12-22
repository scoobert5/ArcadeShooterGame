import { GameState } from '../core/GameState';
import { InputState } from '../core/InputManager';

export interface System {
  update(dt: number, state: GameState, input: InputState): void;
}