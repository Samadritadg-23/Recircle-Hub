import { pipeline } from "@huggingface/transformers";

const extractor = await pipeline(
  "feature-extraction",
  "Xenova/all-MiniLM-L6-v2"
);

const texts = [
  "I need a laptop for coding assignments",
  "Used notebook computer in good condition",
  "Study lamp with USB port"
];

const vectors = [];

for (const text of texts) {
  const result = await extractor(text, {
    pooling: "mean",
    normalize: true
  });

  vectors.push(Array.from(result.data));
}

function similarity(a, b) {
  return a.reduce((sum, value, i) => sum + value * b[i], 0);
}

console.log(
  "Laptop ↔ Computer:",
  similarity(vectors[0], vectors[1]).toFixed(3)
);

console.log(
  "Laptop ↔ Lamp:",
  similarity(vectors[0], vectors[2]).toFixed(3)
);
