export type Difficulty = "easy" | "medium" | "hard";

export interface ExamQuestion {
  question_text: string;
  options: [string, string, string, string];
  correct_index: 0 | 1 | 2 | 3;
  explanation: string;
  key_concept: string;
  domain_id: 1 | 2 | 3 | 4 | 5;
  scenario_id: 1 | 2 | 3 | 4 | 5 | 6;
  task_statement_id: string;
  difficulty: Difficulty;
  anti_patterns_in_distractors: string[];
}
