export class Loop {
  private lastTime: number = 0;
  private animationFrameId: number | null = null;
  private readonly onUpdate: (dt: number) => void;
  public isRunning: boolean = false;

  constructor(onUpdate: (dt: number) => void) {
    this.onUpdate = onUpdate;
  }

  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.lastTime = performance.now();
    this.loop();
  }

  stop() {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private loop = () => {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    // Calculate delta time in seconds
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    // Safety Cap: Prevent huge time jumps if tab is inactive (e.g., max 0.1s aka 10FPS)
    const safeDelta = Math.min(deltaTime, 0.1);

    this.onUpdate(safeDelta);

    this.animationFrameId = requestAnimationFrame(this.loop);
  };
}