import "./style.css";
import type { Difficulty } from "@core/Difficulty";
import { difficultyLabel } from "@core/Difficulty";
import { PerformanceClock, type SongClock } from "@core/GameClock";
import { GameSession } from "@core/GameSession";
import { DRUM_LANES } from "@chart/LaneConfiguration";
import { generateTestChart, TEST_CHART_MEASURES } from "@chart/TestChart";
import { loadJSON } from "@chart/ChartLoader";
import { getDifficultyNotes } from "@chart/SongChart";
import { RhythmGameScene } from "@gameplay/RhythmGameScene";
import { COUNTDOWN_LEAD_SECONDS } from "@gameplay/Countdown";
import { AudioEngine } from "@audio/AudioEngine";
import { SongPlayer } from "@audio/SongPlayer";
import { AudioSyncManager } from "@audio/AudioSyncManager";
import { synthesizeTestBeat } from "@audio/TestBeatSynth";

const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `
  <div class="rotate-prompt">Rotate your phone to portrait to play.</div>
  <div class="game-root">
    <div class="difficulty-select" id="difficulty-select">
      <h1>ROCK BAND WEB</h1>
      <div class="subtitle" id="subtitle">Test Pattern — Drums</div>
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
const subtitle = document.getElementById("subtitle")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const buttons = document.querySelectorAll<HTMLButtonElement>("[data-difficulty]");

let activeScene: RhythmGameScene | null = null;
let audioEngine: AudioEngine | null = null;

/**
 * Web Audio requires the AudioContext to be created/resumed from within a
 * user-gesture handler on iOS — this is that handler. Falls back to the
 * Phase 1 performance-clock (silent) if audio setup fails for any reason,
 * so a synthesis or decode error never leaves the game unplayable.
 */
async function createClock(): Promise<SongClock> {
  try {
    audioEngine ??= new AudioEngine();
    await audioEngine.resume();

    const buffer = await synthesizeTestBeat(audioEngine.context, {
      bpm: rawChart.bpm,
      beatsPerMeasure: rawChart.beatsPerMeasure,
      offsetSeconds: rawChart.offset,
      measureCount: TEST_CHART_MEASURES,
    });

    const player = new SongPlayer(audioEngine.context, buffer);
    return new AudioSyncManager(player, COUNTDOWN_LEAD_SECONDS);
  } catch (error) {
    console.error("Audio setup failed, falling back to a silent clock.", error);
    return new PerformanceClock();
  }
}

async function startGame(difficulty: Difficulty): Promise<void> {
  for (const button of buttons) button.disabled = true;
  subtitle.textContent = "Loading…";

  const clock = await createClock();

  difficultySelect.classList.add("hidden");
  canvas.classList.remove("hidden");
  for (const button of buttons) button.disabled = false;
  subtitle.textContent = "Test Pattern — Drums";

  const notes = getDifficultyNotes(compiledChart, difficulty);
  const session = new GameSession(notes, clock, DRUM_LANES);

  activeScene?.destroy();
  activeScene = new RhythmGameScene(canvas, session, DRUM_LANES);
  activeScene.start();

  document.title = `Rock Band Web — ${difficultyLabel(difficulty)}`;
}

for (const button of buttons) {
  button.addEventListener("click", () => {
    void startGame(button.dataset.difficulty as Difficulty);
  });
}
