/**
 * Vectorize helper for the Historian's semantic case search.
 * Uses the `tribunal-case-memory` index (768 dimensions, cosine metric).
 */
export class VectorizeClient {
  constructor(private index: VectorizeIndex) {}

  /** Store a case embedding for later semantic retrieval. */
  async indexCase(caseId: string, summary: string, embedding: number[]): Promise<void> {
    await this.index.upsert([
      {
        id: caseId,
        values: embedding,
        metadata: { summary },
      },
    ]);
  }

  /** Find semantically similar past cases. Returns case IDs + scores. */
  async searchSimilarCases(
    embedding: number[],
    topK: number = 5,
  ): Promise<{ caseId: string; score: number; summary: string }[]> {
    const results = await this.index.query(embedding, {
      topK,
      returnMetadata: "all",
    });

    return results.matches.map((m) => ({
      caseId: m.id,
      score: m.score,
      summary: (m.metadata?.summary as string) ?? "",
    }));
  }

  /** Remove a case from the index. */
  async deleteCase(caseId: string): Promise<void> {
    await this.index.deleteByIds([caseId]);
  }
}
