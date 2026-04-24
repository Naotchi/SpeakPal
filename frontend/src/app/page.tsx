"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChatHistory, type Message } from "@/components/ChatHistory";
import { ChatMessage } from "@/components/ChatMessage";
import { MicButton } from "@/components/MicButton";
import { PartnerPicker } from "@/components/PartnerPicker";
import { ScenarioChip } from "@/components/ScenarioChip";
import { ScenarioPicker } from "@/components/ScenarioPicker";
import { TranslateModal } from "@/components/TranslateModal";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { streamAudio, translateAudio, type HistoryMessage, type TranslateResponse } from "@/lib/api";
import { FREE_TALK_ID, getScenario, loadScenarioId, saveScenarioId } from "@/lib/scenarios";
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type PartnerSettings, type Preset } from "@/lib/settings";
import { addItem, getDueCount } from "@/lib/srs";

type MicState = "idle" | "recording" | "processing";

function getMicAccessErrorMessage(e: unknown): string {
  if (e instanceof DOMException && e.name === "NotAllowedError") {
    return "マイクへのアクセスが拒否されました。ブラウザのマイク許可を確認してください。";
  }
  if (e instanceof DOMException && e.name === "NotFoundError") {
    return "マイクが見つかりません。マイクが接続されているか確認してください。";
  }
  return "マイクにアクセスできませんでした。もう一度お試しください。";
}

const EMPTY_RECORDING_MESSAGE =
  "音声が録音されませんでした。マイクの接続を確認して、もう一度お試しください。";

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [micState, setMicState] = useState<MicState>("idle");
  const [translateState, setTranslateState] = useState<MicState>("idle");
  const [translateResult, setTranslateResult] = useState<TranslateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [streamingFeedback, setStreamingFeedback] = useState<string | null>(null);
  const [settings, setSettings] = useState<PartnerSettings>(DEFAULT_SETTINGS);
  const [scenarioId, setScenarioId] = useState<string>(FREE_TALK_ID);
  const [partnerPickerOpen, setPartnerPickerOpen] = useState(false);
  const [freeTalkStarted, setFreeTalkStarted] = useState(false);
  const [dueCount, setDueCount] = useState<number>(0);
  const chatRecorder = useAudioRecorder();
  const translateRecorder = useAudioRecorder();
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingRef = useRef<boolean>(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const streamingTextRef = useRef<string>("");
  const streamingFeedbackRef = useRef<string | null>(null);
  const streamingBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSettings(loadSettings());
    setScenarioId(loadScenarioId());
  }, []);

  useEffect(() => {
    const refresh = () => setDueCount(getDueCount());
    refresh();
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === "speakpal.srsItems") refresh();
    };
    window.addEventListener("storage", onStorage);
    const id = window.setInterval(refresh, 60_000);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.clearInterval(id);
    };
  }, []);

  const bumpDueCount = useCallback(() => {
    setDueCount(getDueCount());
  }, []);

  const handleAddToReview = useCallback(
    (prompt: string, answer: string) => {
      addItem({ prompt, answer, source: "correction" });
      bumpDueCount();
    },
    [bumpDueCount],
  );

  useEffect(() => {
    streamingBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [streamingText]);

  const playNextChunk = useCallback(() => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      return;
    }
    const b64 = audioQueueRef.current.shift()!;
    const audio = new Audio(`data:audio/wav;base64,${b64}`);
    currentAudioRef.current = audio;
    isPlayingRef.current = true;
    audio.onended = () => playNextChunk();
    audio.onerror = () => playNextChunk();
    audio.play().catch(() => playNextChunk());
  }, []);

  const handleMicClick = useCallback(async () => {
    setError(null);

    if (micState === "recording") {
      setMicState("processing");
      try {
        const audioBlob = await chatRecorder.stopRecording();

        if (audioBlob.size === 0) {
          setError(EMPTY_RECORDING_MESSAGE);
          setMicState("idle");
          return;
        }

        streamingTextRef.current = "";
        streamingFeedbackRef.current = null;
        audioQueueRef.current = [];
        isPlayingRef.current = false;
        currentAudioRef.current?.pause();
        currentAudioRef.current = null;

        const history: HistoryMessage[] = messages.map((m) => ({
          role: m.role,
          content: m.text,
        }));

        const scenario = getScenario(scenarioId);
        const persona = scenario?.promptSnippet || settings.instructions;

        await streamAudio(audioBlob, {
          onUserText: (text) => {
            setMessages((prev) => [...prev, { role: "user", text }]);
          },
          onAiChunk: (chunk) => {
            streamingTextRef.current += chunk;
            setStreamingText(streamingTextRef.current);
          },
          onAiFeedback: (feedback) => {
            streamingFeedbackRef.current = feedback;
            setStreamingFeedback(feedback);
          },
          onAiAudioChunk: (b64) => {
            audioQueueRef.current.push(b64);
            if (!isPlayingRef.current) playNextChunk();
          },
          onDone: () => {
            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                text: streamingTextRef.current,
                feedback: streamingFeedbackRef.current,
              },
            ]);
            setStreamingText(null);
            setStreamingFeedback(null);
            setMicState("idle");
          },
          onError: (msg) => {
            setError(msg);
            setStreamingText(null);
            setStreamingFeedback(null);
            setMicState("idle");
          },
        }, history, persona);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
        setStreamingText(null);
        setStreamingFeedback(null);
        setMicState("idle");
      }
    } else {
      try {
        await chatRecorder.startRecording();
        setMicState("recording");
      } catch (e) {
        setError(getMicAccessErrorMessage(e));
      }
    }
  }, [micState, chatRecorder, messages, playNextChunk, scenarioId, settings.instructions]);

  const handleScenarioSelect = useCallback((id: string) => {
    if (id === FREE_TALK_ID) {
      setPartnerPickerOpen(true);
      return;
    }
    saveScenarioId(id);
    setScenarioId(id);
    const scenario = getScenario(id);
    if (scenario?.starter) {
      setMessages((prev) => [...prev, { role: "assistant", text: scenario.starter }]);
    }
  }, []);

  const handlePartnerSelect = useCallback((preset: Preset) => {
    saveSettings(preset.settings);
    setSettings(preset.settings);
    saveScenarioId(FREE_TALK_ID);
    setScenarioId(FREE_TALK_ID);
    setPartnerPickerOpen(false);
    setFreeTalkStarted(true);
  }, []);

  const handlePartnerBack = useCallback(() => {
    setPartnerPickerOpen(false);
  }, []);

  const handleScenarioClear = useCallback(() => {
    saveScenarioId(FREE_TALK_ID);
    setScenarioId(FREE_TALK_ID);
    setPartnerPickerOpen(false);
    setFreeTalkStarted(false);
    setMessages([]);
    setStreamingText(null);
    setStreamingFeedback(null);
    streamingTextRef.current = "";
    streamingFeedbackRef.current = null;
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    currentAudioRef.current?.pause();
    currentAudioRef.current = null;
  }, []);

  const handleTranslateClick = useCallback(async () => {
    setError(null);

    if (translateState === "recording") {
      setTranslateState("processing");
      try {
        const blob = await translateRecorder.stopRecording();
        if (blob.size === 0) {
          setError(EMPTY_RECORDING_MESSAGE);
          setTranslateState("idle");
          return;
        }
        const history: HistoryMessage[] = messages.map((m) => ({
          role: m.role,
          content: m.text,
        }));
        const result = await translateAudio(blob, history);
        setTranslateResult(result);
        setTranslateState("idle");
      } catch (e) {
        setError(e instanceof Error ? e.message : "翻訳に失敗しました。");
        setTranslateState("idle");
      }
      return;
    }

    try {
      await translateRecorder.startRecording();
      setTranslateState("recording");
    } catch (e) {
      setError(getMicAccessErrorMessage(e));
    }
  }, [translateState, translateRecorder, messages]);

  const chatDisabled = translateState !== "idle";
  const translateDisabled = micState !== "idle";
  const activeScenario = getScenario(scenarioId);
  const showPicker = messages.length === 0 && scenarioId === FREE_TALK_ID && !freeTalkStarted;
  const displaySpeakerName = activeScenario?.speakerName || settings.name;

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto">
      <header className="relative flex items-center justify-center py-4 border-b border-gray-200">
        <h1 className="text-xl font-semibold">SpeakPal</h1>
        <Link
          href="/review"
          className="absolute right-4 text-sm text-blue-600 hover:text-blue-800"
        >
          復習{dueCount > 0 ? `（${dueCount}）` : ""}
        </Link>
      </header>

      {!showPicker && (
        <ScenarioChip
          emoji={activeScenario?.id !== FREE_TALK_ID ? activeScenario?.emoji ?? "💬" : "💬"}
          label={activeScenario?.id !== FREE_TALK_ID ? activeScenario?.label ?? "" : settings.name}
          onClear={handleScenarioClear}
        />
      )}

      <div className="flex-1 overflow-y-auto">
        {showPicker ? (
          partnerPickerOpen ? (
            <PartnerPicker onSelect={handlePartnerSelect} onBack={handlePartnerBack} />
          ) : (
            <ScenarioPicker onSelect={handleScenarioSelect} />
          )
        ) : (
          <>
            <ChatHistory
              messages={messages}
              partnerName={displaySpeakerName}
              onAddToReview={handleAddToReview}
            />
            {streamingText !== null && (
              <div className="px-4">
                <ChatMessage
                  role="assistant"
                  text={streamingText}
                  feedback={streamingFeedback}
                  partnerName={displaySpeakerName}
                />
                <div ref={streamingBottomRef} />
              </div>
            )}
          </>
        )}
      </div>

      {error && (
        <div className="mx-4 mb-2 px-4 py-2 bg-red-50 text-red-600 text-sm rounded-lg border border-red-200">
          {error}
        </div>
      )}

      <div className="flex flex-col items-center gap-3 py-5 border-t border-gray-200 bg-white">
        <div className="flex items-center gap-2">
          <MicButton
            state={translateState}
            onClick={handleTranslateClick}
            disabled={translateDisabled}
            variant="translate"
            size="sm"
          />
          <span className="text-[11px] text-gray-500 leading-tight">
            {translateState === "recording"
              ? "押して停止"
              : translateState === "processing"
                ? "翻訳中…"
                : "言葉に詰まったら日本語で言ってみる"}
          </span>
        </div>

        <div className="flex flex-col items-center gap-1.5">
          <MicButton
            state={micState}
            onClick={handleMicClick}
            disabled={chatDisabled}
            variant="primary"
          />
          <span className="text-xs font-medium text-gray-700">
            {micState === "recording"
              ? "押して停止"
              : micState === "processing"
                ? "処理中…"
                : "英語で話す"}
          </span>
          <span className="text-[10px] text-gray-400 leading-tight">
            {micState === "idle" ? "開始・終了で2回押す" : "\u00A0"}
          </span>
        </div>
      </div>

      <TranslateModal
        result={translateResult}
        onClose={() => setTranslateResult(null)}
        onReviewAdded={bumpDueCount}
      />
    </div>
  );
}
