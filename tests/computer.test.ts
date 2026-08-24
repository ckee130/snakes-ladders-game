import { describe, it, expect } from "vitest";
import { Game } from "../src/game.js";
import type { DieRollFn } from "../src/types.js";

function rolls(...values: number[]): DieRollFn {
  let i = 0;
  return () => {
    const value = values[i++];
    if (value === undefined) throw new Error("No more rolls");
    return value;
  };
}

describe("computer opponent", () => {
  it("auto-rolls and moves on a computer turn", () => {
    const game = new Game({
      players: [{ name: "Ada" }, { name: "CPU", isComputer: true }],
      roll: rolls(6, 2, 4),
      snakes: [],
      ladders: [],
    });

    game.takeTurn(1); // Ada: 1 → 2
    const result = game.playComputerTurn(); // CPU rolls 4: 1 → 5

    expect(result.player.name).toBe("CPU");
    expect(result).toMatchObject({ roll: 4, to: 5 });
    expect(game.currentPlayer.name).toBe("Ada");
  });

  it("plays consecutive computer turns until a human", () => {
    const game = new Game({
      players: [
        { name: "CPU-A", isComputer: true },
        { name: "CPU-B", isComputer: true },
        { name: "Ada" },
      ],
      roll: rolls(6, 4, 1, 2, 3),
      snakes: [],
      ladders: [],
    });

    const results = game.playComputers();

    expect(results.map((r) => r.player.name)).toEqual(["CPU-A", "CPU-B"]);
    expect(results[0]).toMatchObject({ roll: 2, to: 3 });
    expect(results[1]).toMatchObject({ roll: 3, to: 4 });
    expect(game.currentPlayer.name).toBe("Ada");
  });

  it("rejects playComputerTurn for a human", () => {
    const game = new Game({
      players: [{ name: "Ada" }, { name: "CPU", isComputer: true }],
      roll: rolls(6, 1),
      snakes: [],
      ladders: [],
    });

    expect(() => game.playComputerTurn()).toThrow("Current player is not a computer");
  });
});
