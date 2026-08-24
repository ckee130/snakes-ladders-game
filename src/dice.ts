import type { DieRollFn } from "./types.js";

export const DIE_FACES = 6;

export const rollDie: DieRollFn = () => Math.floor(Math.random() * DIE_FACES) + 1;

export function assertDieRoll(value: number): number {
  if (!Number.isInteger(value) || value < 1 || value > DIE_FACES) {
    throw new Error(`Die roll must be 1-${DIE_FACES}: ${value}`);
  }
  return value;
}
