export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  fire: boolean;
  pointer: { x: number; y: number };
}

export class InputManager {
  state: InputState = {
    up: false,
    down: false,
    left: false,
    right: false,
    fire: false,
    pointer: { x: 0, y: 0 },
  };

  constructor() {
    // Bindings will be set up in attach()
  }

  attach(element: HTMLElement) {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    element.addEventListener('mousemove', this.handleMouseMove);
    element.addEventListener('mousedown', this.handleMouseDown);
    element.addEventListener('mouseup', this.handleMouseUp);
  }

  detach(element: HTMLElement) {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    element.removeEventListener('mousemove', this.handleMouseMove);
    element.removeEventListener('mousedown', this.handleMouseDown);
    element.removeEventListener('mouseup', this.handleMouseUp);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    switch (e.code) {
      case 'KeyW': case 'ArrowUp': this.state.up = true; break;
      case 'KeyS': case 'ArrowDown': this.state.down = true; break;
      case 'KeyA': case 'ArrowLeft': this.state.left = true; break;
      case 'KeyD': case 'ArrowRight': this.state.right = true; break;
      case 'Space': this.state.fire = true; break;
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    switch (e.code) {
      case 'KeyW': case 'ArrowUp': this.state.up = false; break;
      case 'KeyS': case 'ArrowDown': this.state.down = false; break;
      case 'KeyA': case 'ArrowLeft': this.state.left = false; break;
      case 'KeyD': case 'ArrowRight': this.state.right = false; break;
      case 'Space': this.state.fire = false; break;
    }
  };

  private handleMouseMove = (e: MouseEvent) => {
    // Coordinate translation happens here or in the engine
    // For now, raw client coordinates relative to the canvas
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    this.state.pointer.x = e.clientX - rect.left;
    this.state.pointer.y = e.clientY - rect.top;
  };

  private handleMouseDown = () => {
    this.state.fire = true;
  };

  private handleMouseUp = () => {
    this.state.fire = false;
  };

  getState(): InputState {
    return { ...this.state };
  }
}