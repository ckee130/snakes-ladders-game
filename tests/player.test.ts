import { describe, it, expect } from "vitest";
import { START_POSITION } from "../src/board.js";
import { createPlayer } from "../src/player.js";

describe("createPlayer", () => {
  it("starts on square 1", () => {
    expect(createPlayer("Ada")).toEqual({
      name: "Ada",
      isComputer: false,
      position: START_POSITION,
    });
  });

  it("marks computer players", () => {
    expect(createPlayer("CPU", true).isComputer).toBe(true);
  });

  it("rejects empty names", () => {
    expect(() => createPlayer("  ")).toThrow("Player name is required");
  });
});
