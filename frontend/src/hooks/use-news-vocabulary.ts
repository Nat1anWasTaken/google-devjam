import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getWords, updateWord } from "@/lib/api/vocabulary";

export function useNewsVocabulary(wordInNews: string[]) {
  const wordsQuery = useQuery({
    queryKey: ["vocabulary"],
    queryFn: () => getWords(),
  });

  const relatedWords =
    wordsQuery.data?.words.filter((word) => wordInNews.includes(word.word)) ||
    [];

  const wordsToQuiz = relatedWords
    .sort((a, b) => a.fluency - b.fluency)
    .slice(0, 5);

  return {
    wordsQuery,
    relatedWords,
    wordsToQuiz,
  };
}
