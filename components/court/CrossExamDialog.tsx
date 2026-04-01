"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MicButton } from "@/components/shared/MicButton";
import { AgentAvatar } from "@/components/shared/AgentAvatar";
import { AudioWaveform } from "./AudioWaveform";

interface CrossExamDialogProps {
  open: boolean;
  question: string;
  isJudgeSpeaking: boolean;
  isRecording: boolean;
  isTranscribing?: boolean;
  transcript: string;
  onToggleRecording: () => void;
  onSubmit: (response: string) => void;
}

export function CrossExamDialog({
  open,
  question,
  isJudgeSpeaking,
  isRecording,
  isTranscribing = false,
  transcript,
  onToggleRecording,
  onSubmit,
}: CrossExamDialogProps) {
  const [editedTranscript, setEditedTranscript] = useState("");
  const displayText = editedTranscript || transcript;

  // Reset edited transcript when dialog opens with new question
  useEffect(() => {
    if (open) setEditedTranscript("");
  }, [open]);

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-lg [&>button]:hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AgentAvatar role="judge" size="sm" />
            Cross-Examination
          </DialogTitle>
          <DialogDescription>
            The Judge has a question for you.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-[10px] border border-[#1f1e1b] bg-[#1a1917] p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#7a756c]">
              The Judge asks:
            </span>
            <AudioWaveform
              isActive={isJudgeSpeaking}
              className="h-4 text-[#5b8def]"
            />
          </div>
          <p className="text-[12px] leading-relaxed text-[#a39e93]">{question}</p>
        </div>

        <div className="flex flex-col items-center gap-3 py-2">
          <MicButton
            isRecording={isRecording}
            onPress={onToggleRecording}
            onRelease={() => {}}
          />
          <p className="text-[10px] text-[#7a756c]">
            {isTranscribing
              ? "Transcribing..."
              : isRecording
                ? "Listening... tap to stop"
                : "Tap to speak"}
          </p>
        </div>

        {displayText && (
          <textarea
            value={displayText}
            onChange={(e) => setEditedTranscript(e.target.value)}
            className="min-h-[80px] w-full resize-none rounded-[10px] border border-[#1f1e1b] bg-[#1a1917] px-3 py-2 text-[12px] text-[#ede9e1] placeholder:text-[#52504a] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#7a756c]"
            placeholder="Your response will appear here..."
          />
        )}

        <button
          onClick={() => onSubmit(displayText)}
          disabled={!displayText.trim()}
          className="w-full rounded-lg bg-[#ede9e1] py-2.5 text-[13px] font-semibold text-[#121210] transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          Submit Response
        </button>
      </DialogContent>
    </Dialog>
  );
}
