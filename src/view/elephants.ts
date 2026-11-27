import type { Object3D } from 'three';
import { createRng } from '../game/rng';

/** Slow idle movement of the four world elephants: trunk, ears, tail, head and blinking eyes. */
export interface ElephantAnimation {
  /** Call every frame with the time in seconds. */
  update(seconds: number): void;
  enabled: boolean;
}

const BLINK_TIME = 0.22;

interface Parts {
  trunk?: Object3D;
  head?: Object3D;
  tail?: Object3D;
  earLeft?: Object3D;
  earRight?: Object3D;
  eyes: (Object3D | undefined)[];
  phase: number;
  nextBlink: number;
  blinkStart: number;
}

export function createElephantAnimation(root: Object3D): ElephantAnimation {
  const rnd = createRng(31);
  const elephants: Parts[] = [1, 2, 3, 4].map((k) => {
    const part = (name: string): Object3D | undefined => root.getObjectByName(`Elephant_${k}_${name}`);
    return {
      trunk: part('Trunk'),
      head: part('Head'),
      tail: part('Tail'),
      earLeft: part('Ear_L'),
      earRight: part('Ear_R'),
      eyes: [part('Eye_L'), part('Eye_R')],
      phase: rnd() * Math.PI * 2,
      nextBlink: 1 + rnd() * 4,
      blinkStart: -1,
    };
  });

  const animation: ElephantAnimation = {
    enabled: true,
    update(t) {
      const on = animation.enabled;
      for (const e of elephants) {
        const p = e.phase;
        // The elephants face outwards, so their local axes are: x sideways, y up, z backwards.
        e.trunk?.rotation.set(on ? 0.1 * Math.sin(0.5 * t + p + 1) : 0, on ? 0.3 * Math.sin(0.7 * t + p) : 0, 0);
        e.head?.rotation.set(on ? 0.05 * Math.sin(0.4 * t + p) : 0, on ? 0.1 * Math.sin(0.3 * t + p) : 0, 0);
        const flap = on ? 0.18 * Math.sin(0.9 * t + p) : 0;
        e.earLeft?.rotation.set(0, flap, 0);
        e.earRight?.rotation.set(0, -flap, 0);
        e.tail?.rotation.set(0, 0, on ? 0.3 * Math.sin(1.1 * t + p) : 0);

        if (on && e.blinkStart < 0 && t >= e.nextBlink) e.blinkStart = t;
        let open = 1;
        if (e.blinkStart >= 0) {
          const progress = (t - e.blinkStart) / BLINK_TIME;
          if (progress >= 1) {
            e.blinkStart = -1;
            e.nextBlink = t + 2.5 + rnd() * 4;
          } else {
            open = 1 - 0.92 * Math.sin(Math.PI * progress);
          }
        }
        for (const eye of e.eyes) eye?.scale.set(1, on ? open : 1, 1);
      }
    },
  };
  return animation;
}
