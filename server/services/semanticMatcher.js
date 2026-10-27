
import { pipeline } from "@huggingface/transformers";

let extractorPromise;

async function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2"
    ).catch((error) => {
      extractorPromise = null;
      throw error;
    });
  }

  return extractorPromise;
}

export async function embedTexts(texts) {
  const extractor = await getExtractor();

  const results = await Promise.all(
    texts.map((text) =>
      extractor(text, {
        pooling: "mean",
        normalize: true,
      })
    )
  );

  return results.map((result) => Array.from(result.data));
}

export function cosineSimilarity(a, b) {
  if (!a?.length || a.length !== b?.length) {
    throw new Error("Invalid embedding vectors");
  }

  return a.reduce((sum, value, index) => sum + value * b[index], 0);
}
