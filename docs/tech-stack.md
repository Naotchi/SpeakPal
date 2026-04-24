# 技術スタック

バージョンは `backend/requirements.txt` と `frontend/package.json` が正。ここでは「なぜ採用したか」「どう使うか」を書く。

## バックエンド

| 項目 | 採用 | 備考 |
| --- | --- | --- |
| 言語 | Python 3.12 | Docker image は `python:3.12-slim` |
| Web フレームワーク | FastAPI | 非同期 I/O と型ヒントベースのバリデーションが欲しかった |
| ASGI サーバ | Uvicorn (standard) | 開発時は `--reload` |
| 音声認識 | Azure Speech-to-Text REST (`httpx`) | SDK は使わず REST を直接叩く (非同期にしやすいため) |
| 音声合成 | `azure-cognitiveservices-speech` SDK | 同期 API なので `asyncio.to_thread` で呼び出す |
| LLM | `openai` SDK の `AzureOpenAI` | Chat Completions を同期で呼び `asyncio.to_thread` |
| 音声変換 | ffmpeg (subprocess) | webm/opus → 16kHz mono WAV |
| 設定 | `python-dotenv` + `os.environ` | シークレットは `.env` から読む (コミット禁止) |
| multipart | `python-multipart` | FastAPI の `UploadFile` 依存 |

依存追加時は `requirements.txt` にピン留め範囲 (`>=`) を書き、バージョンアップ時は手元で `pip install -U` したあと動作確認する。

## フロントエンド

| 項目 | 採用 | 備考 |
| --- | --- | --- |
| フレームワーク | Next.js 15 (App Router) | `src/app/` 配下を使用。Pages Router は使わない |
| UI ライブラリ | React 19 | Server Components は今のところ使っていない (全画面 `"use client"`) |
| 言語 | TypeScript 5.5+ | strict モード |
| スタイリング | Tailwind CSS v4 + PostCSS | `@tailwindcss/postcss` |
| 状態管理 | なし (`useState`/`useRef`) | 規模が小さいので意図的に未導入 |
| HTTP | ブラウザ `fetch` | ライブラリは入れない |
| 録音 | `MediaRecorder` API | `audio/webm;codecs=opus` 固定 |
| 再生 | HTML `<audio>` + data URL | base64 WAV を直接流し込む |

依存追加は控えめに。標準 API で足りるなら入れない。

## インフラ / 実行環境

| 項目 | 採用 | 備考 |
| --- | --- | --- |
| 開発環境 | Docker Compose | `backend`/`frontend` の 2 サービス |
| バックエンドコンテナ | `python:3.12-slim` + ffmpeg | `libssl`, `libasound2-dev` も入れている |
| フロントエンドコンテナ | `node:22-slim` | 開発モード (`next dev`) で起動 |
| 本番デプロイ | 未定 | 決まったら ADR を起こす |

## 言語・ロケール

- UI のエラーメッセージは日本語、AI 応答は英語。system prompt で英会話相手になるよう指示している。
- 音声合成は `en-US-JennyNeural` 固定。話者を切り替えられるようにするのは将来の拡張。
