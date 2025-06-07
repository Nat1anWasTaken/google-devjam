"use client";

import { getWord } from "@/lib/api/vocabulary";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";

export default function WordPage() {
  const params = useParams();
  const wordId = params.wordId as string;

  const {
    data: word,
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ["word", wordId],
    queryFn: () => getWord(wordId),
    enabled: !!wordId,
  });

  if (loading) {
    return (
      <div className="py-8 px-6">
        <div className="max-w-2xl mx-auto">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !word) {
    return (
      <div className="py-8 px-6">
        <div className="max-w-2xl mx-auto">
          <p>{error?.message || "Word not found"}</p>
        </div>
      </div>
    );
  }
}
