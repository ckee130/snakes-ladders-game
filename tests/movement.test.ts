import { describe, it, expect } from "vitest";
import { Board } from "../src/board.js";
import { move } from "../src/movement.js";

const board = new Board({
  snakes: [{ mouth: 12, tail: 2 }],
  ladders: [{ bottom: 4, top: 14 }],
});

describe("move", () => {
  it("moves forward by the roll", () => {
    expect(move(board, 1, 3)).toMatchObject({
      from: 1,
      roll: 3,
      tentative: 4,
      to: 14,
      moved: true,
      effect: { type: "ladder", from: 4, to: 14 },
      won: false,
    });
  });

  it("slides on a snake", () => {
    expect(move(board, 10, 2)).toMatchObject({
      tentative: 12,
      to: 2,
      effect: { type: "snake", from: 12, to: 2 },
    });
  });

  it("stays put when overshooting 100", () => {
    expect(move(board, 97, 4)).toEqual({
      from: 97,
      roll: 4,
      tentative: 101,
      to: 97,
      moved: false,
      effect: null,
      won: false,
    });
  });

  it("wins on an exact 100", () => {
    expect(move(board, 97, 3)).toMatchObject({
      to: 100,
      moved: true,
      won: true,
      effect: null,
    });
  });

  it("does not chain after a snake or ladder", () => {
    const chained = new Board({
      snakes: [{ mouth: 12, tail: 4 }],
      ladders: [{ bottom: 4, top: 20 }],
    });

    expect(move(chained, 10, 2).to).toBe(4);
  });
});
