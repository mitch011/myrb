export type Difficulty = "easy" | "medium" | "hard";

export const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

export function difficultyLabel(difficulty: Difficulty): string {
  switch (difficulty) {
    case "easy":
      return "EASY";
    case "medium":
      return "MEDIUM";
    case "hard":
      return "HARD";
  }
}
