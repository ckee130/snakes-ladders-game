import { BOARD_SIZE } from "./board.js";
import type { Board } from "./board.js";
import { assertDieRoll } from "./dice.js";
import type { BoardEffect } from "./types.js";

export type MoveResult = Readonly<{
  from: number;
  roll: number;
  tentative: number;
  to: number;
  moved: boolean;
  effect: BoardEffect;
  won: boolean;
}>;

export function move(board: Board, from: number, roll: number): MoveResult {
  assertDieRoll(roll);

  const tentative = from + roll;
  if (tentative > BOARD_SIZE) {
    return { from, roll, tentative, to: from, moved: false, effect: null, won: false };
  }

  const { position: to, effect } = board.resolvePosition(tentative);
  return { from, roll, tentative, to, moved: true, effect, won: to === BOARD_SIZE };
}
