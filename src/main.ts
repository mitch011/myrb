import "./style.css";
import type { Difficulty } from "@core/Difficulty";
import { difficultyLabel } from "@core/Difficulty";
import { PerformanceClock, type SongClock } from "@core/GameClock";
import { GameSession } from "@core/GameSession";
import { calibrationOffsetSeconds, loadSettings, saveSettings, type GameSettings } from "@core/Settings";
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
import { requestMotionPermission } from "@input/MotionManager";
import { setHapticsEnabled } from "@input/Haptics";
import { getBestResult, recordResult } from "@models/PlayerProfile";
import type { PlayStats } from "@models/Score";

const SONG_ID = "test-pattern";

const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `
  <div class="rotate-prompt">Rotate your phone to portrait to play.</div>
  <div class="game-root">
    <div class="overlay-screen" id="difficulty-select">
      <h1>ROCK BAND WEB</h1>
      <div class="subtitle" id="subtitle">Test Pattern — Drums</div>
      <div class="best-result" id="best-result"></div>
      <div class="action-buttons">
        <button class="easy" data-difficulty="easy">EASY</button>
        <button class="medium" data-difficulty="medium">MEDIUM</button>
        <button class="hard" data-difficulty="hard">HARD</button>
      </div>
      <button class="text-button" id="settings-open">SETTINGS</button>
    </div>

    <div class="overlay-screen hidden" id="settings-screen">
      <h1>SETTINGS</h1>
      <div class="settings-form">
        <label class="settings-row">
          Audio Offset: <span id="audio-offset-value">0ms</span>
          <input type="range" id="audio-offset" min="-200" max="200" step="5" />
        </label>
        <label class="settings-row">
          Input Offset: <span id="input-offset-value">0ms</span>
          <input type="range" id="input-offset" min="-200" max="200" step="5" />
        </label>
        <label class="settings-row checkbox">
          No-Fail Mode
          <input type="checkbox" id="no-fail" />
        </label>
        <label class="settings-row checkbox">
          Haptics
          <input type="checkbox" id="haptics" />
        </label>
      </div>
      <button class="text-button" id="settings-back">BACK</button>
    </div>

    <canvas class="game-canvas hidden" id="game-canvas"></canvas>

    <div class="overlay-screen hidden" id="results-screen">
      <h1 id="results-heading">CHERUB ROCK</h1>
      <div class="subtitle" id="results-subtitle">DRUMS — HARD</div>
      <div class="results-failed hidden" id="results-failed">YOU FAILED</div>
      <div class="results-stars" id="results-stars"></div>
      <div class="results-stats" id="results-stats"></div>
      <div class="action-buttons">
        <button id="retry-button">RETRY</button>
        <button id="change-difficulty-button">CHANGE DIFFICULTY</button>
        <button id="song-select-button">SONG SELECT</button>
      </div>
    </div>
  </div>
`;

// Chart is compiled from raw JSON to exercise the same validation/compile
// path a real fetched chart (e.g. Cherub Rock's) would go through.
const rawChart = JSON.parse(JSON.stringify(generateTestChart()));
const compiledChart = loadJSON(rawChart, DRUM_LANES);

const difficultySelect = document.getElementById("difficulty-select")!;
const settingsScreen = document.getElementById("settings-screen")!;
const resultsScreen = document.getElementById("results-screen")!;
const subtitle = document.getElementById("subtitle")!;
const bestResultEl = document.getElementById("best-result")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const difficultyButtons = document.querySelectorAll<HTMLButtonElement>("[data-difficulty]");

const audioOffsetInput = document.getElementById("audio-offset") as HTMLInputElement;
const audioOffsetValue = document.getElementById("audio-offset-value")!;
const inputOffsetInput = document.getElementById("input-offset") as HTMLInputElement;
const inputOffsetValue = document.getElementById("input-offset-value")!;
const noFailInput = document.getElementById("no-fail") as HTMLInputElement;
const hapticsInput = document.getElementById("haptics") as HTMLInputElement;

const resultsFailedEl = document.getElementById("results-failed")!;
const resultsStarsEl = document.getElementById("results-stars")!;
const resultsStatsEl = document.getElementById("results-stats")!;
const resultsSubtitleEl = document.getElementById("results-subtitle")!;

let settings: GameSettings = loadSettings();
let activeScene: RhythmGameScene | null = null;
let audioEngine: AudioEngine | null = null;
let currentDifficulty: Difficulty = "medium";

function applySettingsToForm(): void {
  audioOffsetInput.value = String(settings.audioOffsetMs);
  audioOffsetValue.textContent = `${settings.audioOffsetMs}ms`;
  inputOffsetInput.value = String(settings.inputOffsetMs);
  inputOffsetValue.textContent = `${settings.inputOffsetMs}ms`;
  noFailInput.checked = settings.noFailMode;
  hapticsInput.checked = settings.hapticsEnabled;
}

function persistSettings(): void {
  saveSettings(settings);
  setHapticsEnabled(settings.hapticsEnabled);
}

applySettingsToForm();
persistSettings();

audioOffsetInput.addEventListener("input", () => {
  settings = { ...settings, audioOffsetMs: Number(audioOffsetInput.value) };
  audioOffsetValue.textContent = `${settings.audioOffsetMs}ms`;
  persistSettings();
});
inputOffsetInput.addEventListener("input", () => {
  settings = { ...settings, inputOffsetMs: Number(inputOffsetInput.value) };
  inputOffsetValue.textContent = `${settings.inputOffsetMs}ms`;
  persistSettings();
});
noFailInput.addEventListener("change", () => {
  settings = { ...settings, noFailMode: noFailInput.checked };
  persistSettings();
});
hapticsInput.addEventListener("change", () => {
  settings = { ...settings, hapticsEnabled: hapticsInput.checked };
  persistSettings();
});

document.getElementById("settings-open")!.addEventListener("click", () => {
  difficultySelect.classList.add("hidden");
  settingsScreen.classList.remove("hidden");
});
document.getElementById("settings-back")!.addEventListener("click", () => {
  settingsScreen.classList.add("hidden");
  difficultySelect.classList.remove("hidden");
});

function showBestResult(difficulty: Difficulty): void {
  const best = getBestResult(SONG_ID, difficulty);
  bestResultEl.textContent = best
    ? `Best: ${best.bestScore.toLocaleString()} — ${"★".repeat(best.bestStars)}${"☆".repeat(5 - best.bestStars)}`
    : "";
}
showBestResult(currentDifficulty);

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

function showResults(result: PlayStats, failed: boolean): void {
  resultsSubtitleEl.textContent = `DRUMS — ${difficultyLabel(currentDifficulty)}`;
  resultsFailedEl.classList.toggle("hidden", !failed);
  resultsStarsEl.textContent = failed ? "" : "★".repeat(result.stars) + "☆".repeat(5 - result.stars);

  const accuracyPct = (result.accuracyFraction * 100).toFixed(1);
  resultsStatsEl.innerHTML = `
    <span class="label">Score</span><span>${result.score.toLocaleString()}</span>
    <span class="label">Accuracy</span><span>${accuracyPct}%</span>
    <span class="label">Notes</span><span>${result.perfectCount + result.greatCount + result.goodCount} / ${result.totalNotes}</span>
    <span class="label">Max Combo</span><span>${result.maxCombo}</span>
    <span class="label">Perfect</span><span>${result.perfectCount}</span>
    <span class="label">Great</span><span>${result.greatCount}</span>
    <span class="label">Good</span><span>${result.goodCount}</span>
    <span class="label">Miss</span><span>${result.missCount}</span>
  `;

  recordResult(SONG_ID, currentDifficulty, result);

  canvas.classList.add("hidden");
  resultsScreen.classList.remove("hidden");
}

async function startGame(difficulty: Difficulty): Promise<void> {
  currentDifficulty = difficulty;
  for (const button of difficultyButtons) button.disabled = true;
  subtitle.textContent = "Loading…";

  // Request motion permission first, as close to the click as possible —
  // iOS is stricter about this counting as "from a user gesture" than it is
  // about resuming the AudioContext.
  const motionGranted = await requestMotionPermission();
  const clock = await createClock();

  difficultySelect.classList.add("hidden");
  resultsScreen.classList.add("hidden");
  canvas.classList.remove("hidden");
  for (const button of difficultyButtons) button.disabled = false;
  subtitle.textContent = "Test Pattern — Drums";

  const notes = getDifficultyNotes(compiledChart, difficulty);
  const session = new GameSession(notes, clock, DRUM_LANES, {
    noFailMode: settings.noFailMode,
    calibrationOffsetSeconds: calibrationOffsetSeconds(settings),
  });

  activeScene?.destroy();
  activeScene = new RhythmGameScene(canvas, session, DRUM_LANES, showResults);
  activeScene.start();
  if (motionGranted) activeScene.enableMotion();

  document.title = `Rock Band Web — ${difficultyLabel(difficulty)}`;
}

for (const button of difficultyButtons) {
  button.addEventListener("click", () => {
    void startGame(button.dataset.difficulty as Difficulty);
  });
}

document.getElementById("retry-button")!.addEventListener("click", () => {
  void startGame(currentDifficulty);
});
document.getElementById("change-difficulty-button")!.addEventListener("click", () => {
  resultsScreen.classList.add("hidden");
  showBestResult(currentDifficulty);
  difficultySelect.classList.remove("hidden");
});
document.getElementById("song-select-button")!.addEventListener("click", () => {
  // Only one song exists today; this and "change difficulty" converge here
  // until a real song list (Phase 6+) gives them distinct destinations.
  resultsScreen.classList.add("hidden");
  showBestResult(currentDifficulty);
  difficultySelect.classList.remove("hidden");
});
