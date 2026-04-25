# Architecture Decision Records (ADR)

SpeakPal の設計判断を時系列で記録する場所。

## ADR とは

「なぜ今この実装になっているか」を残すための短いドキュメント。採用した案だけでなく、**検討した代替案と採用しなかった理由**を残すのが目的。後から「なんでこれ使ってるんだっけ」となる時間を減らせる。

## 何を ADR にするか

- ライブラリ/フレームワーク/外部サービスの選定
- API 設計の主要な決め (エンドポイント粒度、レスポンス形式、認証方式など)
- データの持ち方 (DB スキーマ、状態管理の場所)
- インフラ・デプロイ戦略
- 後から変えると他コンポーネントに波及する判断

逆に、ファイル命名規則や小さなリファクタなどは ADR にしない (コード側で語れば済む)。

## 書き方

1. [`template.md`](./template.md) をコピーして `NNNN-<slug>.md` を作る (連番、欠番を作らない)。
2. 書いたら [`README.md` (このファイル)](./README.md) の一覧と、必要なら [`../architecture.md`](../architecture.md) などからリンクを張る。
3. 過去の ADR を**書き換えない**。方針変更は新しい ADR を起こし、古い方は Status を `Superseded by NNNN` に更新する。

## Status の種類

- `Proposed` — 議論中
- `Accepted` — 採用済み (実装と一致している)
- `Deprecated` — 今後採用しない (別の判断は未定)
- `Superseded by NNNN-<slug>` — 別の ADR に置き換わった

## 一覧

| # | タイトル | Status |
| --- | --- | --- |
| [0001](./0001-monorepo-docker-compose.md) | backend と frontend を 1 リポジトリ + docker-compose で扱う | Accepted |
| [0002](./0002-backend-fastapi.md) | バックエンドは FastAPI + Uvicorn | Accepted |
| [0003](./0003-frontend-nextjs-app-router.md) | フロントエンドは Next.js 15 App Router | Accepted |
| [0004](./0004-azure-cognitive-services-speech.md) | 音声認識/合成に Azure Speech を採用 | Accepted |
| [0005](./0005-azure-openai-chat.md) | 会話生成は Azure OpenAI Chat Completions | Accepted |
| [0006](./0006-webm-opus-recording.md) | 録音は webm/opus、サーバで WAV 変換 | Accepted |
| [0007](./0007-single-chat-endpoint.md) | フロントとの結合点は `/api/chat` 1 本 | Accepted |
| [0008](./0008-pytest-local-testing.md) | 自動テストは pytest で backend から段階導入する | Accepted |
| [0009](./0009-docs-rfc-adr-split.md) | ドキュメント運用を Overview / RFC / ADR の 3 層に分ける | Superseded by [0010](./0010-drop-rfc-layer-for-superpowers.md) |
| [0010](./0010-drop-rfc-layer-for-superpowers.md) | RFC 層を廃止し superpowers/specs+plans に一本化する | Accepted |
