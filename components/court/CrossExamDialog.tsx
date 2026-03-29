"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MicButton } from "@/components/shared/MicButton";
import { AgentBadge } from "@/components/shared/AgentBadge";
import { AudioWaveform } from "./AudioWaveform";

interface CrossExamDialogProps {
  open: boolean;
  question: string;
  isJudgeSpeaking: boolean;
  isRecording: boolean;
  transcript: string;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onSubmit: (response: string) => void;
}

export function CrossExamDialog({
  open,
  question,
  isJudgeSpeaking,
  isRecording,
  transcript,
  onStartRecording,
  onStopRecording,
  onSubmit,
}: CrossExamDialogProps) {
  const [editedTranscript, setEditedTranscript] = useState("");

  const displayText = editedTranscript || transcript;

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-lg [&>button]:hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AgentBadge role="judge" />
            Cross-Examination
          </DialogTitle>
          <DialogDescription>
            The Judge has a question for you.
          </DialogDescription>
        </DialogHeader>

        {/* Judge's question */}
        <div className="rounded-lg bg-muted/50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              The Judge asks:
            </span>
            <AudioWaveform isActive={isJudgeSpeaking} className="h-4" />
          </div>
          <p className="text-sm leading-relaxed">{question}</p>
        </div>

        {/* User's response area */}
        <div className="flex flex-col items-center gap-4 py-2">
          <MicButton
            isRecording={isRecording}
            onPress={onStartRecording}
            onRelease={onStopRecording}
          />
          <p className="text-xs text-muted-foreground">
            {isRecording ? "Recording..." : "Hold to speak"}
          </p>
        </div>

        {/* Transcript */}
        {displayText && (
          <textarea
            value={displayText}
            onChange={(e) => setEditedTranscript(e.target.value)}
            className="min-h-[80px] w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Your response will appear here..."
          />
        )}

        <Button
          onClick={() => onSubmit(displayText)}
          disabled={!displayText.trim()}
          className="w-full"
        >
          Submit Response
        </Button>
      </DialogContent>
    </Dialog>
  );
}
