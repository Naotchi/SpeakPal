"use client";

import { PRESETS, type Preset } from "@/lib/settings";

interface PartnerPickerProps {
  onSelect: (preset: Preset) => void;
  onBack: () => void;
}

const PARTNER_META: Record<string, { emoji: string; description: string }> = {
  emma: { emoji: "🫶", description: "カジュアルな友人とおしゃべり" },
  james: { emoji: "🎓", description: "厳しめの英語チューター" },
  sophia: { emoji: "💼", description: "プロっぽいビジネス会話" },
};

export function PartnerPicker({ onSelect, onBack }: PartnerPickerProps) {
  return (
    <div className="flex flex-col items-center px-4 py-8">
      <button
        onClick={onBack}
        className="mb-4 self-start text-xs font-medium text-gray-500 hover:text-gray-800"
      >
        ← シナリオ選択に戻る
      </button>

      <h2 className="mb-1 text-base font-semibold text-gray-900">
        誰と話しますか？
      </h2>
      <p className="mb-6 text-xs text-gray-500">
        相手を選ぶと、その人格で自由会話が始まります。
      </p>

      <div className="grid w-full max-w-lg grid-cols-2 gap-3 sm:grid-cols-3">
        {PRESETS.map((preset) => {
          const meta = PARTNER_META[preset.id] ?? { emoji: "💬", description: "" };
          return (
            <button
              key={preset.id}
              onClick={() => onSelect(preset)}
              className="flex flex-col items-start rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-400 hover:bg-blue-50"
            >
              <span className="mb-2 text-2xl">{meta.emoji}</span>
              <span className="mb-1 text-sm font-semibold text-gray-900">
                {preset.settings.name}
              </span>
              <span className="text-xs leading-snug text-gray-500">
                {meta.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
