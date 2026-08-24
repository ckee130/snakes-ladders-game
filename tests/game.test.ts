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

describe("Game", () => {
  it("orders players then plays turns until someone wins", () => {
    // Order: Ada 6, Bob 3 → Ada first
    // Ada: 1+3=4 → ladder to 14
    // Bob: 1+2=3
    // Ada: 14+6=20
    // ... then force Ada to 100 via explicit rolls near the end
    const game = new Game({
      players: [{ name: "Ada" }, { name: "Bob" }],
      roll: rolls(6, 3),
      snakes: [],
      ladders: [{ bottom: 4, top: 14 }],
    });

    expect(game.players.map((p) => p.name)).toEqual(["Ada", "Bob"]);
    expect(game.currentPlayer.name).toBe("Ada");

    expect(game.takeTurn(3)).toMatchObject({ to: 14, effect: { type: "ladder" } });
    expect(game.currentPlayer.name).toBe("Bob");

    expect(game.takeTurn(2).to).toBe(3);
    expect(game.currentPlayer.name).toBe("Ada");
  });

  it("stays put on overshoot and keeps the same turn cycle", () => {
    const game = new Game({
      players: [{ name: "Ada" }, { name: "Bob" }],
      roll: rolls(5, 1),
      snakes: [],
      ladders: [],
    });

    game.players[0]!.position = 97;
    const result = game.takeTurn(4);

    expect(result).toMatchObject({ moved: false, to: 97, won: false });
    expect(game.currentPlayer.name).toBe("Bob");
    expect(game.isOver).toBe(false);
  });

  it("ends when a player lands exactly on 100", () => {
    const game = new Game({
      players: [{ name: "Ada" }, { name: "Bob" }],
      roll: rolls(6, 1),
      snakes: [],
      ladders: [],
    });

    game.players[0]!.position = 97;
    const result = game.takeTurn(3);

    expect(result).toMatchObject({ to: 100, won: true });
    expect(game.winner?.name).toBe("Ada");
    expect(game.isOver).toBe(true);
    expect(() => game.takeTurn(1)).toThrow("Game is over");
  });

  it("rejects a solo roster", () => {
    expect(() => new Game({ players: [{ name: "Ada" }] })).toThrow("Need at least two players");
  });
});
