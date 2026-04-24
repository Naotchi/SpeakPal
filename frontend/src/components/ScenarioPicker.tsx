"use client";

import { SCENARIOS } from "@/lib/scenarios";

interface ScenarioPickerProps {
  onSelect: (id: string) => void;
}

export function ScenarioPicker({ onSelect }: ScenarioPickerProps) {
  return (
    <div className="flex flex-col items-center px-4 py-8">
      <h2 className="mb-1 text-base font-semibold text-gray-900">
        どんな場面で話しますか？
      </h2>
      <p className="mb-6 text-xs text-gray-500">
        場面を選ぶと、その設定で会話が始まります。
      </p>

      <div className="grid w-full max-w-lg grid-cols-2 gap-3 sm:grid-cols-3">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            className="flex flex-col items-start rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-400 hover:bg-blue-50"
          >
            <span className="mb-2 text-2xl">{s.emoji}</span>
            <span className="mb-1 text-sm font-semibold text-gray-900">
              {s.label}
            </span>
            <span className="text-xs leading-snug text-gray-500">
              {s.description}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
