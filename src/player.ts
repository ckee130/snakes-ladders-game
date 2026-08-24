import { START_POSITION } from "./board.js";
import type { Player } from "./types.js";

export function createPlayer(name: string, isComputer = false): Player {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Player name is required");
  return { name: trimmed, isComputer, position: START_POSITION };
}
