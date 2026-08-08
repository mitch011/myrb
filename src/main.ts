import "./style.css";
import type { Difficulty } from "@core/Difficulty";
import { difficultyLabel } from "@core/Difficulty";
import { PerformanceClock } from "@core/GameClock";
import { GameSession } from "@core/GameSession";
import { DRUM_LANES } from "@chart/LaneConfiguration";
import { generateTestChart } from "@chart/TestChart";
import { loadJSON } from "@chart/ChartLoader";
import { getDifficultyNotes } from "@chart/SongChart";
import { RhythmGameScene } from "@gameplay/RhythmGameScene";

const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `
  <div class="rotate-prompt">Rotate your phone to landscape to play.</div>
  <div class="game-root">
    <div class="difficulty-select" id="difficulty-select">
      <h1>ROCK BAND WEB</h1>
      <div class="subtitle">Test Pattern — Drums</div>
      <div class="difficulty-buttons">
        <button class="easy" data-difficulty="easy">EASY</button>
        <button class="medium" data-difficulty="medium">MEDIUM</button>
        <button class="hard" data-difficulty="hard">HARD</button>
      </div>
    </div>
    <canvas class="game-canvas hidden" id="game-canvas"></canvas>
  </div>
`;

// Chart is compiled from raw JSON to exercise the same validation/compile
// path a real fetched chart (e.g. Cherub Rock's) would go through.
const rawChart = JSON.parse(JSON.stringify(generateTestChart()));
const compiledChart = loadJSON(rawChart, DRUM_LANES);

const difficultySelect = document.getElementById("difficulty-select")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;

let activeScene: RhythmGameScene | null = null;

function startGame(difficulty: Difficulty): void {
  difficultySelect.classList.add("hidden");
  canvas.classList.remove("hidden");

  const notes = getDifficultyNotes(compiledChart, difficulty);
  const session = new GameSession(notes, new PerformanceClock(), DRUM_LANES);

  activeScene?.destroy();
  activeScene = new RhythmGameScene(canvas, session, DRUM_LANES);
  activeScene.start();

  document.title = `Rock Band Web — ${difficultyLabel(difficulty)}`;
}

for (const button of document.querySelectorAll<HTMLButtonElement>("[data-difficulty]")) {
  button.addEventListener("click", () => {
    startGame(button.dataset.difficulty as Difficulty);
  });
}
