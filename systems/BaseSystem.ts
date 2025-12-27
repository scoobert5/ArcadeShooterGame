import { GameState } from '../core/GameState';
import { InputState } from '../core/InputManager';

/**
 * Interface for all Game Systems.
 * Systems contain the logic (behavior) of the game.
 * They mutate the GameState based on inputs and delta time.
 */
export interface System {
  /**
   * Called once per frame by the GameEngine.
   * @param dt - Delta time in seconds since the last frame.
   * @param state - The mutable GameState.
   * @param input - The current state of user inputs.
   */
  update(dt: number, state: GameState, input: InputState): void;
}