import { Difficulty } from "./exam-question";

export interface StudyRecommendation {
  weakestDomains: number[];
  suggestedScenarioIds: number[];
  recommendedDifficulty: Difficulty;
  summary: string;
}
