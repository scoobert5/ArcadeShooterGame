import { EntityManager } from '../entities/EntityManager';
import { PlayerEntity } from '../entities/types';

export enum GameStatus {
  Menu = 'menu',
  Playing = 'playing',
  Paused = 'paused',
  GameOver = 'game_over',
}

export class GameState {
  entityManager: EntityManager;
  status: GameStatus;
  score: number;
  wave: number;
  scoreMultiplier: number;
  
  // Quick access to player to avoid searching entity list constantly
  player: PlayerEntity | null = null; 

  constructor() {
    this.entityManager = new EntityManager();
    this.status = GameStatus.Menu;
    this.score = 0;
    this.wave = 1;
    this.scoreMultiplier = 1;
  }

  reset() {
    this.entityManager.clear();
    this.score = 0;
    this.wave = 1;
    this.scoreMultiplier = 1;
    this.player = null;
    this.status = GameStatus.Playing;
  }
}