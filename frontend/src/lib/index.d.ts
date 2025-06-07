type User = {
  id: string;
  display_name: string;
  email: string;
  password: string;
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
};

type WordExample = {
  id: string;
  word_id: string;
  sentence: string;
};

type Word = {
  id: string;
  word: string;
  translation: string;
  definition_zh: string;
  definition_en: string;
  difficulty: number; // 1-10
  part_of_speech: string;
  root_word: string;
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
};

type WordWithUserData = Word & {
  learn_count: number;
  fluency: number; // 0-100 (integer)
  examples: WordExample[];
};

type UserPreferences = {
  id: string;
  user_id: string;
  level: number; // 1-10
  interests: string[]; // Array of interest strings
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
};

type News = {
  id: string;
  user_id: string;
  title: string;
  content: string;
  level: "beginner" | "intermediate" | "advanced";
  keywords: string[];
  word_in_news: string[];
  source: string[];
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
};
