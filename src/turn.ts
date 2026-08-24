import { assertDieRoll } from "./dice.js";
import type { DieRollFn, Player } from "./types.js";

export function determineTurnOrder(players: readonly Player[], roll: DieRollFn): Player[] {
  if (players.length === 0) throw new Error("Need at least one player");
  return rank(players, roll);
}

export function nextTurnIndex(current: number, playerCount: number): number {
  if (playerCount < 1) throw new Error("Need at least one player");
  if (current < 0 || current >= playerCount) throw new Error(`Invalid turn index: ${current}`);
  return (current + 1) % playerCount;
}

function rank(players: readonly Player[], roll: DieRollFn): Player[] {
  if (players.length <= 1) return [...players];

  const scored = players.map((player) => ({ player, value: assertDieRoll(roll()) }));
  const byValue = new Map<number, Player[]>();

  for (const { player, value } of scored) {
    const group = byValue.get(value);
    if (group) group.push(player);
    else byValue.set(value, [player]);
  }

  return [...byValue.keys()]
    .sort((a, b) => b - a)
    .flatMap((value) => {
      const group = byValue.get(value)!;
      return group.length === 1 ? group : rank(group, roll);
    });
}
