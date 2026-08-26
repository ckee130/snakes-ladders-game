import "./style.css";
import { Game, type Ladder, type Snake, type TurnResult } from "../src/index.ts";

type View = "setup" | "play";
type LogItem = { text: string; kind: "move" | "snake" | "ladder" | "win" | "info" };
type Phase = "idle" | "rolling" | "moving" | "effect" | "blocked";

const app = document.querySelector<HTMLDivElement>("#app")!;

let view: View = "setup";
let game: Game | null = null;
let playerName = "You";
let log: LogItem[] = [];
let lastResult: TurnResult | null = null;
let busy = false;
let dieFace: number | null = null;
let phase: Phase = "idle";
let statusLine = "";
let trail = new Set<number>();
let visualSquare: number[] = [];
let playMounted = false;
let movingPlayerIndex: number | null = null;

const STEP_MS = 220;
const EFFECT_MS = 700;
const ROLL_MS = 520;

function squareToCell(n: number): { row: number; col: number } {
  const rowFromBottom = Math.floor((n - 1) / 10);
  const colInRow = (n - 1) % 10;
  const col = rowFromBottom % 2 === 0 ? colInRow : 9 - colInRow;
  return { row: 9 - rowFromBottom, col };
}

function cellCenterPct(n: number): { x: number; y: number } {
  const { row, col } = squareToCell(n);
  return { x: (col + 0.5) * 10, y: (row + 0.5) * 10 };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function kindOf(result: TurnResult): LogItem["kind"] {
  if (result.won) return "win";
  if (result.effect?.type === "snake") return "snake";
  if (result.effect?.type === "ladder") return "ladder";
  return "move";
}

function describe(result: TurnResult): string {
  const who = result.player.name;
  if (!result.moved) {
    return `${who} rolled ${result.roll} but needs an exact finish — stayed on ${result.from}.`;
  }
  if (result.effect?.type === "snake") {
    return `${who} rolled ${result.roll}: walked to ${result.tentative}, then slid to ${result.to}.`;
  }
  if (result.effect?.type === "ladder") {
    return `${who} rolled ${result.roll}: walked to ${result.tentative}, then climbed to ${result.to}.`;
  }
  if (result.won) return `${who} rolled ${result.roll} and finished on 100!`;
  return `${who} rolled ${result.roll}: ${result.from} → ${result.to}.`;
}

function pushLog(result: TurnResult) {
  log.unshift({ text: describe(result), kind: kindOf(result) });
  if (log.length > 10) log.length = 10;
}

function pathD(from: number, to: number, bend: number): string {
  const a = cellCenterPct(from);
  const b = cellCenterPct(to);
  const mx = (a.x + b.x) / 2 + bend;
  const my = (a.y + b.y) / 2 - Math.sign(b.y - a.y || 1) * Math.abs(bend);
  return `M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`;
}

function renderPaths(snakes: readonly Snake[], ladders: readonly Ladder[]): string {
  const defs = `
    <defs>
      <marker id="arrow-snake" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#c62828" />
      </marker>
      <marker id="arrow-ladder" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#1b7a4a" />
      </marker>
    </defs>
  `;

  const snakesSvg = snakes
    .map((s, i) => {
      const bend = ((i % 5) - 2) * 2.8;
      return `<path d="${pathD(s.mouth, s.tail, bend)}" fill="none" stroke="#c62828" stroke-width="1.35" stroke-linecap="round" opacity="0.9" marker-end="url(#arrow-snake)" />`;
    })
    .join("");

  const laddersSvg = ladders
    .map((l, i) => {
      const bend = ((i % 4) - 1.5) * 2;
      return `<path d="${pathD(l.bottom, l.top, bend)}" fill="none" stroke="#1b7a4a" stroke-width="1.35" stroke-linecap="round" stroke-dasharray="2.6 1.3" opacity="0.95" marker-end="url(#arrow-ladder)" />`;
    })
    .join("");

  return `<svg class="paths" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${defs}${laddersSvg}${snakesSvg}</svg>`;
}

function diePips(value: number | null): string {
  if (value == null) return `<span class="die-q">?</span>`;
  const map: Record<number, number[]> = {
    1: [5],
    2: [1, 9],
    3: [1, 5, 9],
    4: [1, 3, 7, 9],
    5: [1, 3, 5, 7, 9],
    6: [1, 3, 4, 6, 7, 9],
  };
  return (map[value] ?? [])
    .map((slot) => `<i class="pip s${slot}"></i>`)
    .join("");
}

function horseSvg(): string {
  return `
    <svg class="horse" viewBox="0 0 64 64" aria-hidden="true">
      <path d="M12 46c4 6 14 8 22 8s16-3 20-8c-3 1-7 2-12 2-8 0-16-2-22-6z" fill="currentColor" opacity=".22"/>
      <path d="M18 42c2-10 6-18 14-22 3-2 5-5 5-9 4 3 7 8 8 14 5 2 9 7 10 13-5-2-10-3-16-3-8 0-15 2-21 7z" fill="currentColor"/>
      <path d="M36 12c2 1 5 4 6 7-4-1-7-3-9-6 1-1 2-1 3-1z" fill="currentColor"/>
      <circle cx="41" cy="24" r="1.6" fill="#12201c"/>
    </svg>
  `;
}

function syncVisualFromGame() {
  if (!game) return;
  visualSquare = game.players.map((p) => p.position);
}

function pieceOffsets(index: number, square: number): { dx: number; dy: number } {
  const same = visualSquare
    .map((s, i) => ({ s, i }))
    .filter((x) => x.s === square);
  if (same.length < 2) return { dx: 0, dy: 0 };
  const order = same.findIndex((x) => x.i === index);
  return { dx: order === 0 ? -0.55 : 0.55, dy: 0.35 };
}

function updatePieces() {
  if (!game) return;
  game.players.forEach((player, index) => {
    const el = document.querySelector<HTMLElement>(`#piece-${index}`);
    if (!el) return;
    const square = visualSquare[index] ?? player.position;
    const { row, col } = squareToCell(square);
    const { dx, dy } = pieceOffsets(index, square);
    el.style.setProperty("--row", String(row));
    el.style.setProperty("--col", String(col));
    el.style.setProperty("--dx", `${dx}rem`);
    el.style.setProperty("--dy", `${dy}rem`);
    const active =
      movingPlayerIndex === index ||
      (!busy && !game!.isOver && game!.currentPlayer === player);
    el.classList.toggle("active", active);
    el.dataset.square = String(square);
  });
}

function updateTrail() {
  for (const cell of document.querySelectorAll(".cell")) {
    const n = Number((cell as HTMLElement).dataset.square);
    cell.classList.toggle("trail", trail.has(n));
  }
}

function updateDie() {
  const die = document.querySelector(".die");
  if (!die) return;
  die.classList.toggle("rolling", phase === "rolling");
  die.innerHTML = diePips(dieFace);
}

function updateChrome() {
  if (!game || !playMounted) return;

  const winner = game.winner;
  const current =
    movingPlayerIndex != null ? game.players[movingPlayerIndex]! : game.currentPlayer;
  const canRoll = !winner && !busy && !game.currentPlayer.isComputer && phase === "idle";

  const title = document.querySelector("#status-title");
  const detail = document.querySelector("#status-detail");
  const eyebrow = document.querySelector("#status-eyebrow");
  if (eyebrow) eyebrow.textContent = winner ? "Game over" : "Now playing";
  if (title) {
    title.textContent = winner
      ? `${winner.name} wins`
      : phase === "rolling"
        ? `${current.name} is rolling…`
        : phase === "moving"
          ? `${current.name} is moving…`
          : phase === "effect"
            ? lastResult?.effect?.type === "snake"
              ? "Snake!"
              : "Ladder!"
            : phase === "blocked"
              ? "Blocked — need exact 100"
              : current.isComputer
                ? "Computer’s turn"
                : "Your turn";
  }
  if (detail) {
    detail.textContent =
      statusLine ||
      (winner
        ? "Nice game — play again anytime."
        : canRoll
          ? "Roll the die or press Space."
          : current.isComputer
            ? "Watch the computer’s piece move."
            : "Follow the piece across the board.");
  }

  const roster = document.querySelector("#roster");
  if (roster) {
    roster.innerHTML = game.players
      .map((player, index) => {
        const active = !winner && current === player;
        const shown = visualSquare[index] ?? player.position;
        const pct = Math.min(100, Math.round((shown / 100) * 100));
        const klass = player.isComputer ? "cpu" : "you";
        return `
          <li class="${active ? "active" : ""}">
            <span class="mini ${klass}">${horseSvg()}</span>
            <div class="who">
              <strong>${escapeHtml(player.name)}</strong>
              <span>${player.isComputer ? "Computer" : "You"}${active ? " · playing" : ""}</span>
              <div class="progress"><i style="width:${pct}%"></i></div>
            </div>
            <div class="pos">${shown}</div>
          </li>
        `;
      })
      .join("");
  }

  const event = document.querySelector("#event");
  if (event) {
    if (phase === "rolling") {
      event.innerHTML = `<span class="pill wait">Rolling</span><p>Die is spinning…</p>`;
    } else if (phase === "moving") {
      event.innerHTML = `<span class="pill move">Moving</span><p>${escapeHtml(statusLine || "Advancing square by square.")}</p>`;
    } else if (phase === "effect" && lastResult?.effect) {
      const kind = lastResult.effect.type;
      event.innerHTML = `<span class="pill ${kind}">${kind === "snake" ? "Snake" : "Ladder"}</span><p>${escapeHtml(statusLine)}</p>`;
    } else if (phase === "blocked" && lastResult) {
      event.innerHTML = `<span class="pill wait">Blocked</span><p>${escapeHtml(describe(lastResult))}</p>`;
    } else if (lastResult) {
      const kind = kindOf(lastResult);
      const label =
        kind === "win" ? "Winner" : kind === "snake" ? "Snake" : kind === "ladder" ? "Ladder" : "Move";
      event.innerHTML = `<span class="pill ${kind}">${label}</span><p>${escapeHtml(describe(lastResult))}</p>`;
    } else {
      event.innerHTML = `<span class="pill wait">Ready</span><p>Roll to move your horse toward 100.</p>`;
    }
  }

  const actions = document.querySelector("#actions");
  if (actions) {
    if (winner) {
      actions.innerHTML = `
        <div class="win-banner">${escapeHtml(winner.name)} reached 100!</div>
        <button class="btn-primary large" id="replay" type="button">Play again</button>
      `;
      document.querySelector("#replay")?.addEventListener("click", startGame);
    } else {
      actions.innerHTML = `
        <button class="btn-primary large" id="roll" type="button" ${canRoll ? "" : "disabled"}>
          ${phase === "rolling" ? "Rolling…" : phase === "moving" || phase === "effect" ? "Moving…" : "Roll die"}
        </button>
        <p class="hint">Shortcut: Space · watch your horse move</p>
      `;
      document.querySelector("#roll")?.addEventListener("click", () => void onRoll());
    }
  }

  const history = document.querySelector("#history");
  if (history) {
    history.innerHTML = log
      .map((item) => `<li class="${item.kind}">${escapeHtml(item.text)}</li>`)
      .join("");
  }

  updateDie();
  updatePieces();
  updateTrail();
}

async function animateWalk(playerIndex: number, from: number, to: number) {
  if (to === from) return;
  const step = to > from ? 1 : -1;
  let current = from;
  const total = Math.abs(to - from);
  let i = 0;

  while (current !== to) {
    current += step;
    i += 1;
    visualSquare[playerIndex] = current;
    trail.add(current);
    statusLine = `Step ${i} of ${total} → square ${current}`;
    updateChrome();
    await wait(STEP_MS);
  }
}

async function animateEffect(playerIndex: number, from: number, to: number, type: "snake" | "ladder") {
  phase = "effect";
  statusLine =
    type === "snake"
      ? `Sliding down the snake to ${to}…`
      : `Climbing the ladder to ${to}…`;

  const piece = document.querySelector<HTMLElement>(`#piece-${playerIndex}`);
  piece?.classList.add(type === "snake" ? "sliding" : "climbing");

  // Smooth travel along intermediate samples for a visible glide
  const samples = 8;
  for (let i = 1; i <= samples; i++) {
    const t = i / samples;
    const approx = Math.round(from + (to - from) * t);
    visualSquare[playerIndex] = Math.min(100, Math.max(1, approx));
    trail.add(visualSquare[playerIndex]!);
    updateChrome();
    await wait(EFFECT_MS / samples);
  }

  visualSquare[playerIndex] = to;
  updateChrome();
  piece?.classList.remove("sliding", "climbing");
}

async function animateBlocked(playerIndex: number) {
  phase = "blocked";
  statusLine = "Too far — need an exact roll to finish.";
  const piece = document.querySelector<HTMLElement>(`#piece-${playerIndex}`);
  piece?.classList.add("blocked");
  updateChrome();
  await wait(500);
  piece?.classList.remove("blocked");
}

async function playTurnAnimation(playerIndex: number, result: TurnResult) {
  movingPlayerIndex = playerIndex;
  trail = new Set([result.from]);
  lastResult = result;
  dieFace = result.roll;

  if (!result.moved) {
    await animateBlocked(playerIndex);
    movingPlayerIndex = null;
    return;
  }

  phase = "moving";
  statusLine = `Rolled ${result.roll} — walking…`;
  updateChrome();
  await animateWalk(playerIndex, result.from, result.tentative);

  if (result.effect) {
    await animateEffect(playerIndex, result.tentative, result.to, result.effect.type);
  }

  visualSquare[playerIndex] = result.to;
  statusLine = describe(result);
  movingPlayerIndex = null;
  updateChrome();
}

function buildBoardHtml(snakes: readonly Snake[], ladders: readonly Ladder[]): string {
  const snakeAt = new Map(snakes.map((s) => [s.mouth, s.tail]));
  const ladderAt = new Map(ladders.map((l) => [l.bottom, l.top]));

  const cells: string[] = [];
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      const rowFromBottom = 9 - row;
      const n =
        rowFromBottom % 2 === 0
          ? rowFromBottom * 10 + col + 1
          : rowFromBottom * 10 + (9 - col) + 1;

      const classes = ["cell"];
      if ((row + col) % 2 === 1) classes.push("alt");
      if (n === 100) classes.push("goal");

      let badge = "";
      const snakeTo = snakeAt.get(n);
      const ladderTo = ladderAt.get(n);
      if (snakeTo != null) {
        classes.push("has-snake");
        badge = `<span class="badge snake" title="Snake: slide down to ${snakeTo}">S↓${snakeTo}</span>`;
      } else if (ladderTo != null) {
        classes.push("has-ladder");
        badge = `<span class="badge ladder" title="Ladder: climb up to ${ladderTo}">L↑${ladderTo}</span>`;
      }

      cells.push(`
        <div class="${classes.join(" ")}" data-square="${n}">
          <span class="n">${n}</span>
          ${badge}
        </div>
      `);
    }
  }

  const pieces =
    game?.players
      .map((player, index) => {
        const klass = player.isComputer ? "cpu" : "you";
        return `<div class="piece ${klass}" id="piece-${index}" title="${escapeHtml(player.name)}">${horseSvg()}</div>`;
      })
      .join("") ?? "";

  return `
    <div class="board-shell">
      <div class="board" id="board" role="grid" aria-label="Snakes and ladders board">
        ${renderPaths(snakes, ladders)}
        ${cells.join("")}
        <div class="piece-layer">${pieces}</div>
      </div>
    </div>
  `;
}

function mountPlay() {
  if (!game) return;
  const human = game.players.find((p) => !p.isComputer) ?? game.players[0]!;
  const cpu = game.players.find((p) => p.isComputer) ?? game.players[1]!;

  app.innerHTML = `
    <div class="page play-page">
      <div class="topbar">
        <h1 class="brand">Snakes &amp; Ladders <span>Demo</span></h1>
        <button class="btn-quiet" id="again" type="button">New game</button>
      </div>

      <div class="play">
        <div class="board-column">
          <div class="status">
            <div class="status-copy">
              <p class="eyebrow" id="status-eyebrow">Now playing</p>
              <h2 id="status-title">Your turn</h2>
              <p id="status-detail">Roll the die or press Space.</p>
            </div>
            <div class="die" aria-live="polite">${diePips(dieFace)}</div>
          </div>

          ${buildBoardHtml(game.board.snakes, game.board.ladders)}

          <div class="board-key" aria-label="Board key">
            <div class="key-item snake">
              <span class="key-line snake"></span>
              <div>
                <strong>Red = Snake</strong>
                <small>Land on <em>S↓</em> and slide down</small>
              </div>
            </div>
            <div class="key-item ladder">
              <span class="key-line ladder"></span>
              <div>
                <strong>Green = Ladder</strong>
                <small>Land on <em>L↑</em> and climb up</small>
              </div>
            </div>
            <div class="key-item">
              <i class="swatch you"></i>
              <div>
                <strong>${escapeHtml(human.name)}</strong>
                <small>Your horse</small>
              </div>
            </div>
            <div class="key-item">
              <i class="swatch cpu"></i>
              <div>
                <strong>${escapeHtml(cpu.name)}</strong>
                <small>Computer</small>
              </div>
            </div>
          </div>
        </div>

        <aside class="side">
          <section class="card">
            <h3>Players</h3>
            <ul class="players" id="roster"></ul>
          </section>
          <section class="card">
            <h3>Live move</h3>
            <div class="event" id="event"></div>
          </section>
          <section class="card actions" id="actions"></section>
          <section class="card history-card">
            <h3>History</h3>
            <ul class="log" id="history"></ul>
          </section>
        </aside>
      </div>
    </div>
  `;

  playMounted = true;
  document.querySelector("#again")?.addEventListener("click", resetToSetup);
  syncVisualFromGame();
  updateChrome();
}

function renderSetup() {
  playMounted = false;
  app.innerHTML = `
    <div class="page setup">
      <section class="setup-card">
        <h1>Snakes &amp; Ladders</h1>
        <p class="lead">Roll the die and watch your horse walk square by square. Climb ladders, slide on snakes, finish exactly on 100.</p>
        <label>
          Your name
          <input id="name" type="text" maxlength="20" value="${escapeHtml(playerName)}" autocomplete="nickname" />
        </label>
        <div class="rules">
          <div><strong>Animated moves</strong> — your piece walks each square.</div>
          <div><strong>Exact 100</strong> wins · overshoot stays put.</div>
          <div>Press <strong>Space</strong> to roll on your turn.</div>
        </div>
        <button class="btn-primary large" id="start" type="button">Play vs Computer</button>
      </section>
    </div>
  `;

  const input = app.querySelector<HTMLInputElement>("#name")!;
  input.focus();
  input.select();
  input.addEventListener("input", () => {
    playerName = input.value;
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") startGame();
  });
  app.querySelector("#start")!.addEventListener("click", startGame);
}

function startGame() {
  const name = playerName.trim() || "You";
  game = new Game({
    players: [
      { name },
      { name: "Computer", isComputer: true },
    ],
  });
  log = [{ text: `Turn order: ${game.players.map((p) => p.name).join(" → ")}`, kind: "info" }];
  lastResult = null;
  dieFace = null;
  busy = false;
  phase = "idle";
  statusLine = "";
  trail = new Set();
  movingPlayerIndex = null;
  view = "play";
  mountPlay();
  void runComputerTurns();
}

function resetToSetup() {
  game = null;
  log = [];
  lastResult = null;
  dieFace = null;
  busy = false;
  phase = "idle";
  statusLine = "";
  trail = new Set();
  visualSquare = [];
  playMounted = false;
  movingPlayerIndex = null;
  view = "setup";
  renderSetup();
}

async function runComputerTurns() {
  if (!game || game.isOver) return;

  while (game && !game.isOver && game.currentPlayer.isComputer) {
    busy = true;
    const playerIndex = game.players.indexOf(game.currentPlayer);
    movingPlayerIndex = playerIndex;

    phase = "rolling";
    dieFace = null;
    statusLine = "Computer is rolling…";
    updateChrome();
    await wait(ROLL_MS);

    if (!game || game.isOver || !game.currentPlayer.isComputer) break;

    const result = game.playComputerTurn();
    // takeTurn already updated position — rewind visual to start of move for animation
    visualSquare[playerIndex] = result.from;
    updatePieces();
    await playTurnAnimation(playerIndex, result);
    pushLog(result);
    trail = new Set();
    phase = "idle";
    statusLine = "";
    updateChrome();
    await wait(280);
  }

  busy = false;
  phase = "idle";
  updateChrome();
}

async function onRoll() {
  if (!game || game.isOver || busy || game.currentPlayer.isComputer) return;

  busy = true;
  const playerIndex = game.players.indexOf(game.currentPlayer);
  movingPlayerIndex = playerIndex;

  phase = "rolling";
  dieFace = null;
  statusLine = "Rolling…";
  updateChrome();
  await wait(ROLL_MS);

  if (!game || game.isOver) {
    busy = false;
    phase = "idle";
    updateChrome();
    return;
  }

  const result = game.takeTurn();
  visualSquare[playerIndex] = result.from;
  updatePieces();
  await playTurnAnimation(playerIndex, result);
  pushLog(result);
  trail = new Set();
  phase = "idle";
  statusLine = "";
  updateChrome();
  await runComputerTurns();
}

function render() {
  if (view === "setup") renderSetup();
  else if (game) mountPlay();
}

window.addEventListener("keydown", (e) => {
  if (view !== "play") return;
  if (e.code !== "Space" && e.key !== " ") return;
  const tag = (e.target as HTMLElement | null)?.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "BUTTON") return;
  e.preventDefault();
  void onRoll();
});

render();
