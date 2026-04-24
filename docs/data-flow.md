# データフロー

マイクボタンのタップから AI 音声の再生までの一連の流れ。

## シーケンス

```
User          Browser                       Backend                       Azure
 │              │                              │                            │
 │ tap mic ────▶│ getUserMedia()               │                            │
 │              │ MediaRecorder.start()        │                            │
 │ speaks ──────▶│ (chunks buffered)           │                            │
 │ tap mic ────▶│ MediaRecorder.stop()         │                            │
 │              │ Blob (webm/opus)             │                            │
 │              │────── POST /api/chat ───────▶│                            │
 │              │                              │ ffmpeg: webm → 16k WAV     │
 │              │                              │──── POST STT REST ────────▶│
 │              │                              │◀────── DisplayText ────────│
 │              │                              │──── Chat Completion ──────▶│
 │              │                              │◀────── ai_text ────────────│
 │              │                              │──── synth (SDK) ──────────▶│
 │              │                              │◀────── wav bytes ──────────│
 │              │◀─── { user_text, ai_text,    │                            │
 │              │       ai_audio_base64 } ─────│                            │
 │              │ render messages              │                            │
 │              │ new Audio(data:audio/wav;..) │                            │
 │ hears  ◀─────│ audio.play()                 │                            │
```

## ポイント

- **録音コーデックは webm/opus**。ブラウザが対応している最軽量のコーデックを使う ([adr/0006-webm-opus-recording.md](./adr/0006-webm-opus-recording.md))。
- **Azure STT は WAV を要求する**ため、バックエンドで ffmpeg を使って 16kHz mono PCM WAV に変換してから送る。変換をスキップして webm のまま送るとエラーになる。
- **Azure OpenAI と TTS SDK は同期 API**なので、`asyncio.to_thread` でイベントループを塞がないようにしている。STT は `httpx` の非同期クライアントを使えるので別扱い。
- **音声はレスポンスに base64 で埋め込む**。ストリーミングや別エンドポイント化はしない。レスポンス 1 往復で完結するため、フロント実装がシンプルになる。将来 TTS をストリーミングしたくなったら ADR を起こして再設計する。
- **会話履歴はブラウザのメモリのみ**。バックエンドは完全にステートレス。複数ターン対話 (直前の発話を LLM に渡す) を実装するには、フロントから履歴を送るか、サーバ側にセッションを持つかを決める必要がある。

## 失敗経路

| どこで起きる | 現状のハンドリング |
| --- | --- |
| マイク許可拒否 | フロントで `NotAllowedError` を検知し日本語で案内 |
| 無音録音 | フロントで `audioBlob.size === 0` を検知 |
| ffmpeg 変換失敗 | バックで `ValueError` を投げ、422 で返す |
| STT が `RecognitionStatus != Success` | 422 で返し、「音声を認識できませんでした」を表示 |
| Azure OpenAI / TTS 失敗 | 現状は 500 として表に出る。リトライ/フォールバックは未実装 |
| 自動再生ブロック | `audio.play()` の reject は握りつぶし (初回クリック後は通る想定) |

エラーパスを変更するときは、フロントの `page.tsx` のエラー表示とバックの HTTP ステータスを両方見直す。
