"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ReviewCard } from "@/components/ReviewCard";
import {
  applyGrade,
  getDueItems,
  loadItems,
  updateItem,
  type SrsGrade,
  type SrsItem,
} from "@/lib/srs";

type Stats = { forgot: number; vague: number; remembered: number };

function formatNextReview(ts: number): string {
  const diffMs = ts - Date.now();
  if (diffMs <= 0) return "もうすぐ";
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `約${minutes}分後`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `約${hours}時間後`;
  const days = Math.floor(hours / 24);
  return `約${days}日後`;
}

export default function ReviewPage() {
  const [queue, setQueue] = useState<SrsItem[] | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [stats, setStats] = useState<Stats>({ forgot: 0, vague: 0, remembered: 0 });
  const [sessionKey, setSessionKey] = useState(0);
  const [totalItemCount, setTotalItemCount] = useState(0);
  const [nextDueAt, setNextDueAt] = useState<number | null>(null);

  useEffect(() => {
    const all = loadItems();
    setTotalItemCount(all.length);
    const due = getDueItems()
      .slice()
      .sort((a, b) => a.createdAt - b.createdAt);
    setQueue(due);
    setCurrentIdx(0);
    setRevealed(false);
    setStats({ forgot: 0, vague: 0, remembered: 0 });

    if (due.length === 0 && all.length > 0) {
      const soonest = all.reduce((min, it) => Math.min(min, it.nextReviewAt), Infinity);
      setNextDueAt(Number.isFinite(soonest) ? soonest : null);
    } else {
      setNextDueAt(null);
    }
  }, [sessionKey]);

  const currentItem = useMemo(
    () => (queue && currentIdx < queue.length ? queue[currentIdx] : null),
    [queue, currentIdx],
  );

  const handleGrade = useCallback(
    (grade: SrsGrade) => {
      if (!currentItem || !queue) return;
      const updated = applyGrade(currentItem, grade);
      updateItem(currentItem.id, updated);
      setStats((s) => ({ ...s, [grade]: s[grade] + 1 }));

      if (grade === "forgot") {
        setQueue([...queue, updated]);
      }
      setCurrentIdx((i) => i + 1);
      setRevealed(false);
    },
    [currentItem, queue],
  );

  const restartSession = useCallback(() => {
    setSessionKey((k) => k + 1);
  }, []);

  if (queue === null) {
    return (
      <div className="flex flex-col h-screen max-w-2xl mx-auto">
        <Header />
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          読み込み中…
        </div>
      </div>
    );
  }

  const finished = queue.length === 0 || currentIdx >= queue.length;
  const totalGraded = stats.forgot + stats.vague + stats.remembered;

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto">
      <Header
        progress={
          !finished && queue.length > 0
            ? `${currentIdx + 1} / ${queue.length} 件`
            : undefined
        }
      />
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {queue.length === 0 ? (
          <EmptyState total={totalItemCount} nextDueAt={nextDueAt} />
        ) : finished ? (
          <SummaryView
            stats={stats}
            total={totalGraded}
            onRestart={restartSession}
          />
        ) : (
          currentItem && (
            <div className="flex flex-col items-center">
              <ReviewCard
                item={currentItem}
                revealed={revealed}
                onReveal={() => setRevealed(true)}
                onGrade={handleGrade}
              />
            </div>
          )
        )}
      </div>
    </div>
  );
}

function Header({ progress }: { progress?: string }) {
  return (
    <header className="relative flex items-center justify-center py-4 border-b border-gray-200">
      <Link
        href="/"
        className="absolute left-4 text-sm text-blue-600 hover:text-blue-800"
      >
        ← 戻る
      </Link>
      <h1 className="text-xl font-semibold">復習</h1>
      {progress && (
        <span className="absolute right-4 text-xs text-gray-500">{progress}</span>
      )}
    </header>
  );
}

function EmptyState({
  total,
  nextDueAt,
}: {
  total: number;
  nextDueAt: number | null;
}) {
  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center pt-16 gap-3">
        <div className="text-2xl">📭</div>
        <p className="text-gray-700 font-medium">復習アイテムがまだありません</p>
        <p className="text-sm text-gray-500 max-w-xs">
          翻訳結果や会話中の添削から「+ 復習に追加」ボタンで登録してください。
        </p>
        <Link
          href="/"
          className="mt-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          ホームへ
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center text-center pt-16 gap-3">
      <div className="text-3xl">🎉</div>
      <p className="text-gray-700 font-medium">今日の復習は終わりです</p>
      <p className="text-sm text-gray-500">
        登録数: {total} 件
        {nextDueAt !== null && <> ／ 次の復習: {formatNextReview(nextDueAt)}</>}
      </p>
      <Link
        href="/"
        className="mt-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
      >
        ホームへ
      </Link>
    </div>
  );
}

function SummaryView({
  stats,
  total,
  onRestart,
}: {
  stats: Stats;
  total: number;
  onRestart: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center pt-10 gap-4">
      <div className="text-3xl">✨</div>
      <p className="text-xl font-semibold text-gray-900">お疲れ様でした</p>
      <p className="text-sm text-gray-600">今回復習: {total} 件</p>
      <div className="flex gap-4 text-sm">
        <span className="text-green-700">😊 覚えてた: {stats.remembered}</span>
        <span className="text-amber-700">🤔 微妙: {stats.vague}</span>
        <span className="text-red-700">😵 忘れた: {stats.forgot}</span>
      </div>
      <div className="flex gap-3 mt-3">
        <Link
          href="/"
          className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          ホームへ
        </Link>
        <button
          onClick={onRestart}
          className="rounded-full border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          もう一度復習
        </button>
      </div>
    </div>
  );
}
