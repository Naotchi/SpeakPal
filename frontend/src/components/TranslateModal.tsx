"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TranslateResponse } from "@/lib/api";
import { addItem } from "@/lib/srs";

interface TranslateModalProps {
  result: TranslateResponse | null;
  onClose: () => void;
  onReviewAdded?: () => void;
}

export function TranslateModal({ result, onClose, onReviewAdded }: TranslateModalProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [addState, setAddState] = useState<"idle" | "added">("idle");

  const playAudio = useCallback((b64: string) => {
    audioRef.current?.pause();
    const audio = new Audio(`data:audio/wav;base64,${b64}`);
    audioRef.current = audio;
    audio.play().catch(() => {});
  }, []);

  useEffect(() => {
    if (result) playAudio(result.english_audio_base64);
    setAddState("idle");
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, [result, playAudio]);

  const handleAddToReview = useCallback(() => {
    if (!result) return;
    addItem({
      prompt: result.japanese_text,
      answer: result.english_text,
      source: "translate",
    });
    setAddState("added");
    onReviewAdded?.();
  }, [result, onReviewAdded]);

  if (!result) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">これ英語で何て言う？</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-6 space-y-3">
          <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
            <span className="mr-1 text-xs font-semibold text-gray-500">日本語:</span>
            {result.japanese_text}
          </div>
          <div className="rounded-lg bg-blue-50 px-3 py-2 text-base leading-relaxed text-blue-900">
            {result.english_text}
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => playAudio(result.english_audio_base64)}
              className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              もう一度聞く
            </button>
            <button
              onClick={handleAddToReview}
              disabled={addState === "added"}
              className={`text-sm font-medium ${
                addState === "added"
                  ? "text-green-600"
                  : "text-emerald-700 hover:text-emerald-900"
              }`}
            >
              {addState === "added" ? "✓ 追加済み" : "+ 復習に追加"}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-center">
          <button
            onClick={onClose}
            className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
