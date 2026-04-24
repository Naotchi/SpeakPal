"use client";

import { useEffect, useState } from "react";

interface ChatMessageProps {
  role: "user" | "assistant";
  text: string;
  feedback?: string | null;
  partnerName?: string;
  originalUserText?: string;
  onAddToReview?: (prompt: string, answer: string) => void;
}

export function ChatMessage({
  role,
  text,
  feedback,
  partnerName,
  originalUserText,
  onAddToReview,
}: ChatMessageProps) {
  const isUser = role === "user";
  const [added, setAdded] = useState(false);

  useEffect(() => {
    setAdded(false);
  }, [feedback]);

  const handleAdd = () => {
    if (!feedback || !onAddToReview) return;
    onAddToReview(originalUserText ?? "", feedback);
    setAdded(true);
  };

  return (
    <div className={`flex flex-col ${isUser ? "items-end" : "items-start"} mb-3`}>
      {!isUser && partnerName && (
        <div className="text-xs text-gray-500 mb-1 ml-1">{partnerName}</div>
      )}
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-blue-600 text-white rounded-br-md"
            : "bg-white text-gray-800 border border-gray-200 rounded-bl-md shadow-sm"
        }`}
      >
        {text}
      </div>
      {!isUser && feedback && (
        <div className="max-w-[75%] mt-1.5 rounded-xl px-3.5 py-2.5 text-xs leading-relaxed bg-amber-50 border border-amber-200 text-amber-900">
          <span className="font-semibold text-amber-700 mr-1">添削:</span>
          {feedback}
          {onAddToReview && (
            <button
              onClick={handleAdd}
              disabled={added}
              className={`block mt-1.5 text-[11px] font-medium ${
                added ? "text-green-700" : "text-emerald-700 hover:text-emerald-900"
              }`}
            >
              {added ? "✓ 追加済み" : "+ 復習に追加"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
