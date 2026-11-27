import type { Object3D } from 'three';
import { createRng } from '../game/rng';

/** Slow swimming of the world turtle: flippers, head, tail and blinking eyes. Parts come from world.glb. */
export interface TurtleAnimation {
  /** Call every frame with the time in seconds. */
  update(seconds: number): void;
  enabled: boolean;
}

const BEAT_SPEED = 1.1; // rad/s, one full flipper beat takes about six seconds
const BLINK_TIME = 0.2;

function part(root: Object3D, name: string): Object3D | undefined {
  return root.getObjectByName(name);
}

export function createTurtleAnimation(root: Object3D): TurtleAnimation {
  const frontFlippers = ['Turtle_FlipperFront_L', 'Turtle_FlipperFront_R'];
  const rearFlippers = ['Turtle_FlipperRear_L', 'Turtle_FlipperRear_R'];
  const front = frontFlippers.map((n) => part(root, n));
  const rear = rearFlippers.map((n) => part(root, n));
  const head = part(root, 'Turtle_Head');
  const tail = part(root, 'Turtle_Tail');
  const eyes = ['Turtle_Eye_L', 'Turtle_Eye_R'].map((n) => part(root, n));

  const rnd = createRng(77);
  let nextBlink = 2;
  let blinkStart = -1;

  const animation: TurtleAnimation = {
    enabled: true,
    update(t) {
      const on = animation.enabled;
      // Index 0 is the left side (x < 0), index 1 the right side. Both tips rise and fall together.
      for (const [i, flipper] of front.entries()) {
        const side = i === 0 ? -1 : 1;
        flipper?.rotation.set(
          0,
          on ? -side * 0.1 * Math.cos(BEAT_SPEED * t) : 0,
          on ? side * 0.22 * Math.sin(BEAT_SPEED * t) : 0
        );
      }
      for (const [i, flipper] of rear.entries()) {
        const side = i === 0 ? -1 : 1;
        flipper?.rotation.set(0, 0, on ? side * 0.12 * Math.sin(BEAT_SPEED * t + 0.9) : 0);
      }
      head?.rotation.set(on ? 0.04 * Math.sin(0.5 * t + 1) : 0, on ? 0.28 * Math.sin(0.35 * t) : 0, 0);
      tail?.rotation.set(0, on ? 0.15 * Math.sin(0.5 * t) : 0, 0);

      // Blinking: the eyes squash flat for a moment every few seconds.
      if (on && blinkStart < 0 && t >= nextBlink) blinkStart = t;
      let open = 1;
      if (blinkStart >= 0) {
        const p = (t - blinkStart) / BLINK_TIME;
        if (p >= 1) {
          blinkStart = -1;
          nextBlink = t + 2.5 + rnd() * 3.5;
        } else {
          open = 1 - 0.92 * Math.sin(Math.PI * p);
        }
      }
      for (const eye of eyes) eye?.scale.set(1, on ? open : 1, 1);
    },
  };
  return animation;
}
