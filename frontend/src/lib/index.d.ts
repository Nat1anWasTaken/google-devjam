type User = {
  id: string;
  display_name: string;
  email: string;
  password: string;
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
};

type Word = {
  id: string;
  word: string;
  definition: string;
  difficulty: number; // 1-10
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
};

type WordWithUserData = Word & {
  learn_count: number;
  fluency: number; // 0-100
};
