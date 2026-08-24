export type Snake = Readonly<{
  mouth: number;
  tail: number;
}>;

export type Ladder = Readonly<{
  bottom: number;
  top: number;
}>;

export type Player = Readonly<{
  name: string;
  isComputer: boolean;
  position: number;
}>;

export type DieRollFn = () => number;

export type BoardEffect =
  | { type: "snake"; from: number; to: number }
  | { type: "ladder"; from: number; to: number }
  | null;
