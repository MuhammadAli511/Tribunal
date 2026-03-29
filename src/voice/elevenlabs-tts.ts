import type { AgentRole } from "../types";
import { VOICE_CONFIG } from "./voice-config";

const TTS_BASE_URL = "https://api.elevenlabs.io/v1/text-to-speech";
const DEFAULT_MODEL = "eleven_multilingual_v2";

/**
 * Synthesise speech for a given agent role using the ElevenLabs TTS API.
 *
 * @param apiKey  - ElevenLabs API key (from env.ELEVENLABS_API_KEY)
 * @param text    - The text to convert to speech
 * @param role    - The agent role (determines voice and settings)
 * @returns Audio buffer as ArrayBuffer (mp3 format)
 */
export async function synthesiseSpeech(
  apiKey: string,
  text: string,
  role: AgentRole,
): Promise<ArrayBuffer> {
  const voice = VOICE_CONFIG[role];
  const url = `${TTS_BASE_URL}/${voice.voiceId}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: voice.modelId ?? DEFAULT_MODEL,
      voice_settings: {
        stability: voice.stability,
        similarity_boost: voice.similarityBoost,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "unknown error");
    throw new Error(
      `ElevenLabs TTS failed (${response.status}): ${errorText}`,
    );
  }

  return response.arrayBuffer();
}

/**
 * Synthesise speech and return as a base64-encoded string.
 * Useful for broadcasting audio over JSON WebSocket messages.
 */
export async function synthesiseSpeechBase64(
  apiKey: string,
  text: string,
  role: AgentRole,
): Promise<string> {
  const buffer = await synthesiseSpeech(apiKey, text, role);
  return arrayBufferToBase64(buffer);
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
