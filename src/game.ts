import { Board, type BoardOptions } from "./board.js";
import { assertDieRoll, rollDie } from "./dice.js";
import { move, type MoveResult } from "./movement.js";
import { createPlayer } from "./player.js";
import { determineTurnOrder, nextTurnIndex } from "./turn.js";
import type { DieRollFn, Player } from "./types.js";

export type PlayerSpec = Readonly<{
  name: string;
  isComputer?: boolean;
}>;

export type GameOptions = BoardOptions & {
  players: readonly PlayerSpec[];
  roll?: DieRollFn;
};

export type TurnResult = MoveResult & Readonly<{
  player: Player;
}>;

export class Game {
  readonly board: Board;
  readonly players: Player[];
  readonly #roll: DieRollFn;
  #turnIndex = 0;
  #winner: Player | null = null;

  constructor({ players, roll = rollDie, ...boardOptions }: GameOptions) {
    if (players.length < 2) throw new Error("Need at least two players");

    this.board = new Board(boardOptions);
    this.#roll = roll;
    this.players = determineTurnOrder(
      players.map(({ name, isComputer = false }) => createPlayer(name, isComputer)),
      this.#roll,
    );
  }

  get currentPlayer(): Player {
    return this.players[this.#turnIndex]!;
  }

  get winner(): Player | null {
    return this.#winner;
  }

  get isOver(): boolean {
    return this.#winner !== null;
  }

  takeTurn(roll?: number): TurnResult {
    if (this.#winner) throw new Error("Game is over");

    const player = this.currentPlayer;
    const result = move(this.board, player.position, assertDieRoll(roll ?? this.#roll()));
    player.position = result.to;

    if (result.won) this.#winner = player;
    else this.#turnIndex = nextTurnIndex(this.#turnIndex, this.players.length);

    return { ...result, player };
  }
}
