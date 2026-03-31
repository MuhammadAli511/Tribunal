import { createWriteStream } from "fs";
import { config } from "dotenv";

config();

const SOUNDS = [
  {
    name: "gavel",
    text: "sharp wooden gavel strike on a wooden block in a quiet courtroom, single hit, slight reverb echo",
    duration: 2,
  },
  {
    name: "ambiance",
    text: "quiet courtroom ambiance, soft murmuring crowd, occasional paper rustling, no speech, calm background noise",
    duration: 10,
  },
  {
    name: "verdict-sting",
    text: "low dramatic orchestral tone resolving upward, judicial announcement, suspenseful to resolved, cinematic",
    duration: 3,
  },
];

async function generateSound(sound: (typeof SOUNDS)[number]) {
  console.log(`Generating: ${sound.name}...`);

  const response = await fetch("https://api.elevenlabs.io/v1/sound-generation", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": process.env.ELEVENLABS_API_KEY!,
    },
    body: JSON.stringify({
      text: sound.text,
      duration_seconds: sound.duration,
      prompt_influence: 0.4,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Failed to generate ${sound.name}: ${response.status} ${err}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const outPath = `public/sounds/${sound.name}.mp3`;

  const ws = createWriteStream(outPath);
  ws.write(buffer);
  ws.end();

  console.log(`  Saved: ${outPath} (${(buffer.length / 1024).toFixed(1)} KB)`);
}

async function main() {
  console.log("Generating Tribunal sound effects...\n");
  for (const sound of SOUNDS) {
    await generateSound(sound);
  }
  console.log("\nDone! Sound effects saved to public/sounds/");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
