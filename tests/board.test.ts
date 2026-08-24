import { describe, it, expect } from "vitest";
import { Board, DEFAULT_SNAKES, DEFAULT_LADDERS, BOARD_SIZE, START_POSITION } from "../src/board.js";

describe("Board", () => {
  it("uses the default board", () => {
    const board = new Board();

    expect(board.snakes).toBe(DEFAULT_SNAKES);
    expect(board.ladders).toBe(DEFAULT_LADDERS);
  });

  it("exposes board constants", () => {
    expect(BOARD_SIZE).toBe(100);
    expect(START_POSITION).toBe(1);
  });

  it("accepts custom snakes and ladders", () => {
    const board = new Board({
      snakes: [{ mouth: 20, tail: 5 }],
      ladders: [{ bottom: 3, top: 15 }],
    });

    expect(board.getSnakeAt(20)).toEqual({ mouth: 20, tail: 5 });
    expect(board.getLadderAt(3)).toEqual({ bottom: 3, top: 15 });
  });

  it("resolves a snake in one step", () => {
    const board = new Board({ snakes: [{ mouth: 20, tail: 5 }], ladders: [] });

    expect(board.resolvePosition(20)).toEqual({
      position: 5,
      effect: { type: "snake", from: 20, to: 5 },
    });
  });

  it("resolves a ladder in one step", () => {
    const board = new Board({ snakes: [], ladders: [{ bottom: 3, top: 15 }] });

    expect(board.resolvePosition(3)).toEqual({
      position: 15,
      effect: { type: "ladder", from: 3, to: 15 },
    });
  });

  it("leaves normal squares unchanged", () => {
    expect(new Board({ snakes: [], ladders: [] }).resolvePosition(10)).toEqual({
      position: 10,
      effect: null,
    });
  });

  it("rejects invalid snakes, ladders, and duplicate starts", () => {
    expect(() => new Board({ snakes: [{ mouth: 5, tail: 20 }] })).toThrow("Snake must go down");
    expect(() => new Board({ ladders: [{ bottom: 15, top: 3 }] })).toThrow("Ladder must go up");
    expect(() => new Board({ snakes: [{ mouth: 101, tail: 5 }] })).toThrow("out of bounds");
    expect(() =>
      new Board({
        snakes: [{ mouth: 20, tail: 5 }],
        ladders: [{ bottom: 20, top: 50 }],
      }),
    ).toThrow("Duplicate board start");
  });

  it("keeps default entries within the board", () => {
    const board = new Board();

    for (const { mouth, tail } of board.snakes) {
      expect(mouth).toBeGreaterThanOrEqual(START_POSITION);
      expect(mouth).toBeLessThanOrEqual(BOARD_SIZE);
      expect(tail).toBeGreaterThanOrEqual(START_POSITION);
      expect(tail).toBeLessThanOrEqual(BOARD_SIZE);
    }

    for (const { bottom, top } of board.ladders) {
      expect(bottom).toBeGreaterThanOrEqual(START_POSITION);
      expect(bottom).toBeLessThanOrEqual(BOARD_SIZE);
      expect(top).toBeGreaterThanOrEqual(START_POSITION);
      expect(top).toBeLessThanOrEqual(BOARD_SIZE);
    }
  });
});
