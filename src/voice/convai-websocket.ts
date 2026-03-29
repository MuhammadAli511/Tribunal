/**
 * ElevenLabs Conversational AI WebSocket helper.
 *
 * The Judge uses ConvAI for live voice interaction during intake and
 * cross-examination. The flow is:
 *
 *   1. Server (JudgeDO) calls getSignedUrl() to get a secure WebSocket URL
 *   2. Client connects directly to ElevenLabs via the signed URL
 *   3. Client streams mic audio → ConvAI → Judge voice response
 *   4. Client sends transcription results back to server via CaseDO WebSocket
 *
 * This avoids proxying every audio frame through the worker, giving the
 * client a low-latency direct connection to ElevenLabs.
 */

const CONVAI_SIGNED_URL_ENDPOINT =
  "https://api.elevenlabs.io/v1/convai/conversation/get-signed-url";

const CONVAI_WS_ENDPOINT =
  "wss://api.elevenlabs.io/v1/convai/conversation";

// ── Signed URL (server-side) ────────────────────────────────────────────────

/**
 * Get a signed WebSocket URL for the client to connect to ElevenLabs ConvAI.
 * This must be called server-side to protect the API key.
 *
 * @param apiKey  - ElevenLabs API key
 * @param agentId - The ConvAI agent ID for the Judge
 * @returns Signed WebSocket URL the client can connect to directly
 */
export async function getSignedUrl(
  apiKey: string,
  agentId: string,
): Promise<string> {
  const url = `${CONVAI_SIGNED_URL_ENDPOINT}?agent_id=${encodeURIComponent(agentId)}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "xi-api-key": apiKey,
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "unknown error");
    throw new Error(
      `ConvAI signed URL request failed (${response.status}): ${errorText}`,
    );
  }

  const body = (await response.json()) as { signed_url: string };
  return body.signed_url;
}

/**
 * Build a direct (unsigned) ConvAI WebSocket URL for public agents.
 * Only use this for development/testing — production should use signed URLs.
 */
export function getPublicUrl(agentId: string): string {
  return `${CONVAI_WS_ENDPOINT}?agent_id=${encodeURIComponent(agentId)}`;
}

// ── ConvAI message types (server → client) ──────────────────────────────────

export interface ConvAIInitMetadata {
  type: "conversation_initiation_metadata";
  conversation_initiation_metadata_event: {
    conversation_id: string;
    agent_output_audio_format: string;
  };
}

export interface ConvAIUserTranscript {
  type: "user_transcript";
  user_transcription_event: {
    user_transcript: string;
  };
}

export interface ConvAIAgentResponse {
  type: "agent_response";
  agent_response_event: {
    agent_response: string;
  };
}

export interface ConvAIAudioEvent {
  type: "audio";
  audio_event: {
    audio_base_64: string;
    event_id: number;
  };
}

export interface ConvAIPingEvent {
  type: "ping";
  ping_event: {
    event_id: number;
  };
}

export type ConvAIServerMessage =
  | ConvAIInitMetadata
  | ConvAIUserTranscript
  | ConvAIAgentResponse
  | ConvAIAudioEvent
  | ConvAIPingEvent;

// ── ConvAI message types (client → server) ──────────────────────────────────

export interface ConvAIUserAudioChunk {
  user_audio_chunk: string; // base64 encoded audio
}

export interface ConvAIPongMessage {
  type: "pong";
  event_id: number;
}

export type ConvAIClientMessage = ConvAIUserAudioChunk | ConvAIPongMessage;
