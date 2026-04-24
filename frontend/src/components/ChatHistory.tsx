"use client";

import { useEffect, useRef } from "react";
import { ChatMessage } from "./ChatMessage";

export interface Message {
  role: "user" | "assistant";
  text: string;
  feedback?: string | null;
}

interface ChatHistoryProps {
  messages: Message[];
  partnerName?: string;
  onAddToReview?: (prompt: string, answer: string) => void;
}

export function ChatHistory({ messages, partnerName, onAddToReview }: ChatHistoryProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);


  return (
    <div className="px-4 py-6">
      {messages.length === 0 && (
        <div className="flex items-center justify-center h-full text-gray-400 text-center">
          <div>
            <p className="text-lg font-medium mb-1">SpeakPal へようこそ</p>
            <p className="text-sm">マイクを押して英語で話しかけてみましょう</p>
          </div>
        </div>
      )}
      {messages.map((msg, i) => {
        const prev = i > 0 ? messages[i - 1] : null;
        const originalUserText =
          msg.role === "assistant" && prev?.role === "user" ? prev.text : undefined;
        return (
          <ChatMessage
            key={i}
            role={msg.role}
            text={msg.text}
            feedback={msg.feedback}
            partnerName={partnerName}
            originalUserText={originalUserText}
            onAddToReview={onAddToReview}
          />
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
