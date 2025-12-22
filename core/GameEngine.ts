import { GameState, GameStatus } from './GameState';
import { Loop } from './Loop';
import { InputManager } from './InputManager';
import { PlayerSystem } from '../systems/PlayerSystem';
import { EnemySystem } from '../systems/EnemySystem';
import { ProjectileSystem } from '../systems/ProjectileSystem';
import { CollisionSystem } from '../systems/CollisionSystem';
import { ProgressionSystem } from '../systems/ProgressionSystem';
import { System } from '../systems/BaseSystem';

type GameEventType = 'score_change' | 'game_over' | 'wave_change';
type GameEventListener = (data?: any) => void;

export class GameEngine {
  state: GameState;
  inputManager: InputManager;
  loop: Loop;
  
  private systems: System[];
  private listeners: Map<GameEventType, Set<GameEventListener>> = new Map();

  constructor() {
    this.state = new GameState();
    this.inputManager = new InputManager();
    this.loop = new Loop(this.update.bind(this));

    // Initialize Systems order matters: 
    // Input -> Movement -> AI -> Collision -> State Checks
    this.systems = [
      new PlayerSystem(),
      new ProjectileSystem(),
      new EnemySystem(),
      new CollisionSystem(),
      new ProgressionSystem()
    ];
  }

  init(canvasElement: HTMLElement) {
    this.inputManager.attach(canvasElement);
  }

  destroy(canvasElement: HTMLElement) {
    this.inputManager.detach(canvasElement);
    this.loop.stop();
  }

  startGame() {
    this.state.reset();
    // TODO: Initialize Player entity here explicitly
    this.loop.start();
    this.emit('score_change', this.state.score);
  }

  pauseGame() {
    if (this.state.status === GameStatus.Playing) {
      this.state.status = GameStatus.Paused;
      this.loop.stop();
    } else if (this.state.status === GameStatus.Paused) {
      this.state.status = GameStatus.Playing;
      this.loop.start();
    }
  }

  private update(dt: number) {
    if (this.state.status !== GameStatus.Playing) return;

    const input = this.inputManager.getState();

    // Run all systems
    for (const system of this.systems) {
      system.update(dt, this.state, input);
    }

    // Post-update cleanup
    this.state.entityManager.cleanup();
  }

  // Event System for React Communication
  on(event: GameEventType, listener: GameEventListener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(listener);
  }

  off(event: GameEventType, listener: GameEventListener) {
    this.listeners.get(event)?.delete(listener);
  }

  emit(event: GameEventType, data?: any) {
    this.listeners.get(event)?.forEach(listener => listener(data));
  }
}