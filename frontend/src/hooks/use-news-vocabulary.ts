import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getWords, updateWord } from "@/lib/api/vocabulary";

export function useNewsVocabulary(wordInNews: string[]) {
  const queryClient = useQueryClient();

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

  const updateFluencyMutation = useMutation({
    onSuccess: () => {
      // Invalidate and refetch relevant queries after updating fluency
      queryClient.invalidateQueries({ queryKey: ["vocabulary"] });
    },
    mutationFn: async (wordId: string) => {
      // return updateWord();
      // wordId,
      // { fluency: 1 } // Reset fluency to 1 after quiz completion
    },
  });

  return {
    wordsQuery,
    relatedWords,
    wordsToQuiz,
    updateFluencyMutation,
  };
}
