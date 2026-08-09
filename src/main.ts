import "./style.css";
import type { Difficulty } from "@core/Difficulty";
import { DIFFICULTIES, difficultyLabel } from "@core/Difficulty";
import { PerformanceClock, type SongClock } from "@core/GameClock";
import { GameSession } from "@core/GameSession";
import { calibrationOffsetSeconds, loadSettings, saveSettings, type GameSettings } from "@core/Settings";
import { DRUM_LANES } from "@chart/LaneConfiguration";
import { generateTestChart, TEST_CHART_MEASURES } from "@chart/TestChart";
import { loadJSON } from "@chart/ChartLoader";
import { getDifficultyNotes } from "@chart/SongChart";
import { validateCompiledChart } from "@chart/ChartValidator";
import { generateAutoChart } from "@chart/AutoChartGenerator";
import { RhythmGameScene } from "@gameplay/RhythmGameScene";
import { COUNTDOWN_LEAD_SECONDS } from "@gameplay/Countdown";
import { AudioEngine } from "@audio/AudioEngine";
import { SongPlayer } from "@audio/SongPlayer";
import { AudioSyncManager } from "@audio/AudioSyncManager";
import { synthesizeTestBeat } from "@audio/TestBeatSynth";
import { analyzeAudioBuffer } from "@audio/AudioAnalysis";
import { requestMotionPermission } from "@input/MotionManager";
import { setHapticsEnabled } from "@input/Haptics";
import { getBestResult, recordResult } from "@models/PlayerProfile";
import type { PlayStats } from "@models/Score";
import type { LoadedSong } from "@models/Song";

const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `
  <div class="rotate-prompt">Rotate your phone to portrait to play.</div>
  <div class="game-root">
    <div class="overlay-screen" id="song-select">
      <h1>ROCK BAND WEB</h1>
      <div class="subtitle">Choose a song</div>
      <div class="action-buttons" id="song-list"></div>
      <button class="text-button" id="upload-song-button">UPLOAD A SONG</button>
      <input type="file" id="song-file-input" accept="audio/*" class="hidden" />
      <button class="text-button" id="settings-open-from-songs">SETTINGS</button>
    </div>

    <div class="overlay-screen hidden" id="difficulty-select">
      <h1 id="difficulty-song-title">SONG</h1>
      <div class="subtitle" id="difficulty-song-subtitle">DRUMS</div>
      <div class="best-result" id="best-result"></div>
      <div class="action-buttons">
        <button class="easy" data-difficulty="easy">EASY</button>
        <button class="medium" data-difficulty="medium">MEDIUM</button>
        <button class="hard" data-difficulty="hard">HARD</button>
      </div>
      <button class="text-button" id="back-to-songs">SONG SELECT</button>
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
      <h1 id="results-heading">SONG</h1>
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

const screens = {
  songSelect: document.getElementById("song-select")!,
  difficultySelect: document.getElementById("difficulty-select")!,
  settings: document.getElementById("settings-screen")!,
  results: document.getElementById("results-screen")!,
};
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;

function showScreen(name: keyof typeof screens): void {
  canvas.classList.add("hidden");
  for (const screen of Object.values(screens)) screen.classList.add("hidden");
  screens[name].classList.remove("hidden");
}
function showGameplay(): void {
  for (const screen of Object.values(screens)) screen.classList.add("hidden");
  canvas.classList.remove("hidden");
}

const songListEl = document.getElementById("song-list")!;
const uploadButton = document.getElementById("upload-song-button") as HTMLButtonElement;
const fileInput = document.getElementById("song-file-input") as HTMLInputElement;

const difficultySongTitleEl = document.getElementById("difficulty-song-title")!;
const difficultySongSubtitleEl = document.getElementById("difficulty-song-subtitle")!;
const bestResultEl = document.getElementById("best-result")!;
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
const resultsHeadingEl = document.getElementById("results-heading")!;
const resultsSubtitleEl = document.getElementById("results-subtitle")!;

let settings: GameSettings = loadSettings();
let activeScene: RhythmGameScene | null = null;
let audioEngine: AudioEngine | null = null;
let currentSong: LoadedSong | null = null;
let currentDifficulty: Difficulty = "medium";

// ---- Built-in demo song (no upload needed) ----------------------------
const testRawChart = JSON.parse(JSON.stringify(generateTestChart()));
const testCompiledChart = loadJSON(testRawChart, DRUM_LANES);
const songs: LoadedSong[] = [
  {
    id: "test-pattern",
    title: "Test Pattern",
    artist: "Drum Practice",
    chart: testCompiledChart,
    audioBuffer: null,
    estimatedBpm: testRawChart.bpm,
    autoCharted: false,
    testBeatConfig: {
      bpm: testRawChart.bpm,
      beatsPerMeasure: testRawChart.beatsPerMeasure,
      offsetSeconds: testRawChart.offset,
      measureCount: TEST_CHART_MEASURES,
    },
  },
];

// ---- Settings -----------------------------------------------------------
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

document.getElementById("settings-open-from-songs")!.addEventListener("click", () => showScreen("settings"));
document.getElementById("settings-back")!.addEventListener("click", () => showScreen("songSelect"));

// ---- Song list ------------------------------------------------------------
function renderSongList(): void {
  songListEl.innerHTML = "";
  for (const song of songs) {
    const button = document.createElement("button");
    button.textContent = song.artist ? `${song.title} — ${song.artist}` : song.title;
    button.addEventListener("click", () => selectSong(song));
    songListEl.appendChild(button);
  }
}

function renderBestResults(songId: string): void {
  bestResultEl.innerHTML = DIFFICULTIES.map((difficulty) => {
    const best = getBestResult(songId, difficulty);
    const summary = best
      ? `${best.bestScore.toLocaleString()} ${"★".repeat(best.bestStars)}${"☆".repeat(5 - best.bestStars)}`
      : "—";
    return `${difficultyLabel(difficulty)}: ${summary}`;
  }).join("<br>");
}

function selectSong(song: LoadedSong): void {
  currentSong = song;
  difficultySongTitleEl.textContent = song.title.toUpperCase();
  difficultySongSubtitleEl.textContent = `${song.artist} — DRUMS`;
  renderBestResults(song.id);
  showScreen("difficultySelect");
}

document.getElementById("back-to-songs")!.addEventListener("click", () => showScreen("songSelect"));

renderSongList();

// ---- Uploading a song: decode + auto-generate a chart from onsets --------
function guessTitleFromFilename(filename: string): string {
  return filename.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || "Untitled";
}

function slugify(text: string): string {
  const slug = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return slug || "song";
}

uploadButton.addEventListener("click", () => {
  void (async () => {
    // Resume the AudioContext from this click — the file picker's own
    // 'change' event later isn't reliably treated as a user gesture on iOS.
    audioEngine ??= new AudioEngine();
    await audioEngine.resume();
    fileInput.click();
  })();
});

fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  fileInput.value = "";
  if (!file) return;
  void handleUploadedFile(file);
});

async function handleUploadedFile(file: File): Promise<void> {
  uploadButton.disabled = true;
  uploadButton.textContent = "ANALYZING…";

  try {
    const guessedTitle = guessTitleFromFilename(file.name);
    const title = window.prompt("Song title?", guessedTitle) || guessedTitle;
    const artist = window.prompt("Artist?", "") || "Unknown Artist";

    audioEngine ??= new AudioEngine();
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioEngine.context.decodeAudioData(arrayBuffer);

    const { onsets, estimatedBpm } = analyzeAudioBuffer(audioBuffer);
    const auto = generateAutoChart(onsets, DRUM_LANES);
    const chart = { song: title, bpm: estimatedBpm, ...auto };
    validateCompiledChart(chart, audioBuffer.duration);

    const song: LoadedSong = {
      id: `${slugify(title)}-${Date.now()}`,
      title,
      artist,
      chart,
      audioBuffer,
      estimatedBpm,
      autoCharted: true,
    };
    songs.push(song);
    renderSongList();
    selectSong(song);
  } catch (error) {
    console.error("Failed to load uploaded song:", error);
    window.alert("Couldn't read that file as audio. Try a different file.");
  } finally {
    uploadButton.disabled = false;
    uploadButton.textContent = "UPLOAD A SONG";
  }
}

/**
 * Web Audio requires the AudioContext to be created/resumed from within a
 * user-gesture handler on iOS — this is that handler. Falls back to the
 * Phase 1 performance-clock (silent) if audio setup fails for any reason,
 * so a synthesis or decode error never leaves the game unplayable.
 */
async function createClock(song: LoadedSong): Promise<SongClock> {
  try {
    audioEngine ??= new AudioEngine();
    await audioEngine.resume();

    const buffer = song.audioBuffer ?? (await synthesizeTestBeat(audioEngine.context, song.testBeatConfig!));
    const player = new SongPlayer(audioEngine.context, buffer);
    return new AudioSyncManager(player, COUNTDOWN_LEAD_SECONDS);
  } catch (error) {
    console.error("Audio setup failed, falling back to a silent clock.", error);
    return new PerformanceClock();
  }
}

function showResults(result: PlayStats, failed: boolean): void {
  const song = currentSong!;
  resultsHeadingEl.textContent = song.title.toUpperCase();
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

  recordResult(song.id, currentDifficulty, result);
  showScreen("results");
}

async function startGame(difficulty: Difficulty): Promise<void> {
  const song = currentSong;
  if (!song) return;

  currentDifficulty = difficulty;
  for (const button of difficultyButtons) button.disabled = true;

  // Request motion permission first, as close to the click as possible —
  // iOS is stricter about this counting as "from a user gesture" than it is
  // about resuming the AudioContext.
  const motionGranted = await requestMotionPermission();
  const clock = await createClock(song);

  for (const button of difficultyButtons) button.disabled = false;
  showGameplay();

  const notes = getDifficultyNotes(song.chart, difficulty);
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
  if (currentSong) renderBestResults(currentSong.id);
  showScreen("difficultySelect");
});
document.getElementById("song-select-button")!.addEventListener("click", () => {
  showScreen("songSelect");
});
