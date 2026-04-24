export interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  user_text: string;
  ai_text: string;
  ai_feedback: string | null;
  ai_audio_base64: string;
}

export interface StreamCallbacks {
  onUserText: (text: string) => void;
  onAiChunk: (chunk: string) => void;
  onAiFeedback: (feedback: string | null) => void;
  onAiAudio?: (base64: string) => void;
  onAiAudioChunk: (base64: string) => void;
  onDone: () => void;
  onError: (message: string) => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface TranslateResponse {
  japanese_text: string;
  english_text: string;
  english_audio_base64: string;
}

export async function translateAudio(
  audioBlob: Blob,
  history: HistoryMessage[] = [],
): Promise<TranslateResponse> {
  const formData = new FormData();
  formData.append("audio", audioBlob, "recording.webm");
  formData.append("history", JSON.stringify(history));

  const response = await fetch(`${API_URL}/api/translate`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "不明なエラーが発生しました" }));
    throw new Error(error.detail || `リクエストに失敗しました: ${response.status}`);
  }

  return response.json();
}

export async function sendAudio(audioBlob: Blob): Promise<ChatResponse> {
  const formData = new FormData();
  formData.append("audio", audioBlob, "recording.webm");

  const response = await fetch(`${API_URL}/api/chat`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "不明なエラーが発生しました" }));
    throw new Error(error.detail || `リクエストに失敗しました: ${response.status}`);
  }

  return response.json();
}

export async function streamAudio(
  audioBlob: Blob,
  callbacks: StreamCallbacks,
  history: HistoryMessage[] = [],
  persona?: string,
): Promise<void> {
  const formData = new FormData();
  formData.append("audio", audioBlob, "recording.webm");
  formData.append("history", JSON.stringify(history));
  if (persona) formData.append("persona", persona);

  const response = await fetch(`${API_URL}/api/chat/stream`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "不明なエラーが発生しました" }));
    throw new Error(error.detail || `リクエストに失敗しました: ${response.status}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      if (!part.trim()) continue;

      let eventName = "message";
      let eventData = "";

      for (const line of part.split("\n")) {
        if (line.startsWith("event: ")) {
          eventName = line.slice(7);
        } else if (line.startsWith("data: ")) {
          eventData = line.slice(6);
        }
      }

      let parsed: string;
      try {
        parsed = JSON.parse(eventData);
      } catch {
        parsed = eventData;
      }

      switch (eventName) {
        case "user_text":
          callbacks.onUserText(parsed);
          break;
        case "ai_chunk":
          callbacks.onAiChunk(parsed);
          break;
        case "ai_feedback":
          callbacks.onAiFeedback(parsed || null);
          break;
        case "ai_audio_chunk":
          callbacks.onAiAudioChunk(parsed);
          break;
        case "ai_audio":
          callbacks.onAiAudio?.(parsed);
          break;
        case "done":
          callbacks.onDone();
          break;
        case "error":
          callbacks.onError(parsed);
          break;
      }
    }
  }
}
