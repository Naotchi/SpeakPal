"use client";

import type { SrsGrade, SrsItem } from "@/lib/srs";

interface ReviewCardProps {
  item: SrsItem;
  revealed: boolean;
  onReveal: () => void;
  onGrade: (grade: SrsGrade) => void;
}

export function ReviewCard({ item, revealed, onReveal, onGrade }: ReviewCardProps) {
  return (
    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm border border-gray-200">
      <div className="mb-6 min-h-[4rem]">
        <div className="text-xs font-semibold text-gray-500 mb-2">
          {item.source === "translate" ? "日本語" : "あなたの発話"}
        </div>
        <div className="text-lg text-gray-900 leading-relaxed">
          {item.prompt || <span className="text-gray-400">（prompt なし）</span>}
        </div>
      </div>

      {!revealed ? (
        <button
          onClick={onReveal}
          className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700"
        >
          タップして英語を表示
        </button>
      ) : (
        <>
          <div className="mb-5 border-t border-gray-200 pt-4">
            <div className="text-xs font-semibold text-gray-500 mb-2">英語</div>
            <div className="text-lg text-blue-900 leading-relaxed">{item.answer}</div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="text-xs text-gray-500 text-center mb-1">自己評価</div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => onGrade("forgot")}
                className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700 hover:bg-red-100"
              >
                😵 忘れた
              </button>
              <button
                onClick={() => onGrade("vague")}
                className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-medium text-amber-800 hover:bg-amber-100"
              >
                🤔 微妙
              </button>
              <button
                onClick={() => onGrade("remembered")}
                className="rounded-xl border border-green-200 bg-green-50 px-3 py-2.5 text-sm font-medium text-green-700 hover:bg-green-100"
              >
                😊 覚えてた
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
