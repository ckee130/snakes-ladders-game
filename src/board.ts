import type { BoardEffect, Ladder, Snake } from "./types.js";

export const BOARD_SIZE = 100;
export const START_POSITION = 1;

export const DEFAULT_SNAKES: ReadonlyArray<Snake> = [
  { mouth: 16, tail: 6 },
  { mouth: 47, tail: 26 },
  { mouth: 49, tail: 11 },
  { mouth: 56, tail: 53 },
  { mouth: 62, tail: 19 },
  { mouth: 64, tail: 60 },
  { mouth: 87, tail: 24 },
  { mouth: 93, tail: 73 },
  { mouth: 95, tail: 75 },
  { mouth: 98, tail: 78 },
];

export const DEFAULT_LADDERS: ReadonlyArray<Ladder> = [
  { bottom: 2, top: 38 },
  { bottom: 4, top: 14 },
  { bottom: 9, top: 31 },
  { bottom: 21, top: 42 },
  { bottom: 28, top: 84 },
  { bottom: 36, top: 44 },
  { bottom: 51, top: 67 },
  { bottom: 71, top: 91 },
  { bottom: 80, top: 100 },
];

export type BoardOptions = {
  snakes?: ReadonlyArray<Snake>;
  ladders?: ReadonlyArray<Ladder>;
};

export class Board {
  readonly snakes: ReadonlyArray<Snake>;
  readonly ladders: ReadonlyArray<Ladder>;
  readonly #snakesByMouth: ReadonlyMap<number, Snake>;
  readonly #laddersByBottom: ReadonlyMap<number, Ladder>;

  constructor({ snakes = DEFAULT_SNAKES, ladders = DEFAULT_LADDERS }: BoardOptions = {}) {
    validate(snakes, ladders);
    this.snakes = snakes;
    this.ladders = ladders;
    this.#snakesByMouth = new Map(snakes.map((snake) => [snake.mouth, snake]));
    this.#laddersByBottom = new Map(ladders.map((ladder) => [ladder.bottom, ladder]));
  }

  getSnakeAt(position: number): Snake | null {
    return this.#snakesByMouth.get(position) ?? null;
  }

  getLadderAt(position: number): Ladder | null {
    return this.#laddersByBottom.get(position) ?? null;
  }

  resolvePosition(position: number): { position: number; effect: BoardEffect } {
    const snake = this.getSnakeAt(position);
    if (snake) return { position: snake.tail, effect: { type: "snake", from: snake.mouth, to: snake.tail } };

    const ladder = this.getLadderAt(position);
    if (ladder) return { position: ladder.top, effect: { type: "ladder", from: ladder.bottom, to: ladder.top } };

    return { position, effect: null };
  }
}

function validate(snakes: ReadonlyArray<Snake>, ladders: ReadonlyArray<Ladder>): void {
  const starts = new Set<number>();

  for (const { mouth, tail } of snakes) {
    assertSquare(mouth, "Snake mouth");
    assertSquare(tail, "Snake tail");
    if (mouth <= tail) throw new Error(`Snake must go down: ${mouth} -> ${tail}`);
    if (starts.has(mouth)) throw new Error(`Duplicate board start at ${mouth}`);
    starts.add(mouth);
  }

  for (const { bottom, top } of ladders) {
    assertSquare(bottom, "Ladder bottom");
    assertSquare(top, "Ladder top");
    if (bottom >= top) throw new Error(`Ladder must go up: ${bottom} -> ${top}`);
    if (starts.has(bottom)) throw new Error(`Duplicate board start at ${bottom}`);
    starts.add(bottom);
  }
}

function assertSquare(value: number, label: string): void {
  if (value < START_POSITION || value > BOARD_SIZE) {
    throw new Error(`${label} out of bounds: ${value}`);
  }
}
