import { describe, it, expect } from "vitest";
import { assertDieRoll, DIE_FACES, rollDie } from "../src/dice.js";

describe("dice", () => {
  it("rolls within 1-6", () => {
    for (let i = 0; i < 40; i++) {
      const roll = rollDie();
      expect(roll).toBeGreaterThanOrEqual(1);
      expect(roll).toBeLessThanOrEqual(DIE_FACES);
    }
  });

  it("rejects invalid rolls", () => {
    expect(() => assertDieRoll(0)).toThrow("Die roll must be 1-6");
    expect(() => assertDieRoll(7)).toThrow("Die roll must be 1-6");
    expect(() => assertDieRoll(2.5)).toThrow("Die roll must be 1-6");
  });
});
