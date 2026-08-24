import { describe, it, expect } from "vitest";
import { createPlayer } from "../src/player.js";
import { determineTurnOrder, nextTurnIndex } from "../src/turn.js";
import type { DieRollFn } from "../src/types.js";

function rolls(...values: number[]): DieRollFn {
  let i = 0;
  return () => {
    const value = values[i++];
    if (value === undefined) throw new Error("No more rolls");
    return value;
  };
}

describe("determineTurnOrder", () => {
  const ada = createPlayer("Ada");
  const bob = createPlayer("Bob");
  const cpu = createPlayer("CPU", true);

  it("orders by highest roll first", () => {
    expect(determineTurnOrder([ada, bob, cpu], rolls(3, 6, 1))).toEqual([bob, ada, cpu]);
  });

  it("re-rolls ties until ordered", () => {
    // Ada 5, Bob 5, CPU 2 → Ada/Bob tied → Ada 4, Bob 6
    expect(determineTurnOrder([ada, bob, cpu], rolls(5, 5, 2, 4, 6))).toEqual([bob, ada, cpu]);
  });

  it("rejects an empty roster", () => {
    expect(() => determineTurnOrder([], rolls(1))).toThrow("Need at least one player");
  });
});

describe("nextTurnIndex", () => {
  it("rotates through players", () => {
    expect(nextTurnIndex(0, 3)).toBe(1);
    expect(nextTurnIndex(2, 3)).toBe(0);
  });
});
