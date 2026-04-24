"use client";

interface ScenarioChipProps {
  emoji: string;
  label: string;
  onClear: () => void;
}

export function ScenarioChip({ emoji, label, onClear }: ScenarioChipProps) {
  return (
    <div className="flex justify-center px-4 py-2">
      <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-800">
        <span>{emoji}</span>
        <span>{label}</span>
        <button
          onClick={onClear}
          aria-label="会話を終了してシナリオ選択に戻る"
          title="会話を終了（シナリオ選択に戻る）"
          className="ml-0.5 text-blue-400 hover:text-blue-700"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
