import { GameEntity, EntityType } from './types';

export class EntityManager {
  entities: GameEntity[] = [];

  add(entity: GameEntity) {
    this.entities.push(entity);
  }

  remove(id: string) {
    this.entities = this.entities.filter(e => e.id !== id);
  }

  removeByType(type: EntityType) {
    this.entities = this.entities.filter(e => e.type !== type);
  }

  getByType(type: EntityType): GameEntity[] {
    return this.entities.filter(e => e.type === type);
  }

  getAll(): GameEntity[] {
    return this.entities;
  }

  cleanup() {
    this.entities = this.entities.filter(e => e.active);
  }
  
  clear() {
    this.entities = [];
  }
}