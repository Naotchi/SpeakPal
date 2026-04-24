# アーキテクチャ

SpeakPal は、マイクで録音した英語音声を AI に渡し、テキストと音声で返答を受け取る英会話練習アプリ。フロントエンド (Next.js) とバックエンド (FastAPI) の 2 プロセス構成で、音声認識・LLM・音声合成は Azure のマネージドサービスに委譲している。

## 全体構成

```
┌───────────────────────┐         ┌──────────────────────────┐
│  Browser (Next.js)    │         │  Backend (FastAPI)       │
│                       │  POST   │                          │
│  MediaRecorder ──────▶│ /api/   │  /api/chat               │
│  (webm/opus)          │  chat   │    ├─ Speech-to-Text     │
│                       │ ──────▶ │    ├─ Chat Completion    │
│  <audio> ◀── base64 ──┼─────── │    └─ Text-to-Speech     │
│                       │ (json)  │                          │
└───────────────────────┘         └────────────┬─────────────┘
                                               │ HTTPS
                                  ┌────────────▼─────────────┐
                                  │  Azure Cognitive Services │
                                  │  + Azure OpenAI            │
                                  └───────────────────────────┘
```

## 責務分割

### フロントエンド (Next.js App Router + React 19)

- **UI とマイク制御のみ**を担当する薄いクライアント。
- ブラウザの `MediaRecorder API` で音声を録音し、`webm/opus` Blob として `/api/chat` に送信する。
- 返却された base64 WAV を `<audio>` で再生し、文字起こし・AI 応答テキストをチャット UI に追加する。
- 状態管理ライブラリは導入していない (`useState` と `useRef` で十分な規模)。

### バックエンド (FastAPI)

- **音声を受け取り、Azure の 3 つのサービスを順番に叩いて結果を返す**オーケストレーション層。
- 現時点ではビジネスロジックと呼べるものは「system prompt の固定」「ffmpeg による WAV 変換」のみ。
- DB・永続化層は存在しない (会話履歴はクライアントのメモリにのみ存在する)。
- ルーターは `app/routers/`、外部サービス呼び出しは `app/services/` に分離している。

### 外部サービス

| サービス | 用途 |
| --- | --- |
| Azure Speech-to-Text (REST) | webm/opus → WAV 変換後に送信、英語の文字起こし |
| Azure OpenAI (Chat Completions) | 文字起こし結果を system prompt と合わせて応答生成 |
| Azure Speech-to-Text (SDK) | 応答テキストから英語音声を合成 (Jenny voice) |

採用理由は [adr/0004-azure-cognitive-services-speech.md](./adr/0004-azure-cognitive-services-speech.md) と [adr/0005-azure-openai-chat.md](./adr/0005-azure-openai-chat.md) を参照。

## リクエスト/レスポンス契約

バックエンドは 1 エンドポイント (`POST /api/chat`) のみを公開する。フロントとバックの結合点はこの一点に集約する方針 ([adr/0007-single-chat-endpoint.md](./adr/0007-single-chat-endpoint.md))。

- Request: `multipart/form-data` の `audio` フィールド (webm/opus)
- Response: `{ user_text, ai_text, ai_audio_base64 }`

契約を変えるときは、フロントの `lib/api.ts` とバックの `routers/chat.py` を同じ PR で更新する。

## 非機能要件の現状

- **認証**: なし。ローカル/検証前提。外部公開する際は ADR を起票して設計する。
- **会話履歴**: サーバには保持しない。ブラウザをリロードすると消える。複数ターン対話や履歴保存を実装するときは、状態をどこに置くかから議論する。
- **レート制御・コスト監視**: なし。Azure 側の課金に直結するので、公開前に必須。
- **CORS**: `http://localhost:3000` のみ許可。

これらを変更する場合は ADR に記録すること。
