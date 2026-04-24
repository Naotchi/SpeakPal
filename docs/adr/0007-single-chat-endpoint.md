# 0007. フロントとの結合点は `/api/chat` 1 本

- Status: Accepted
- Date: 2026-04-19
- Deciders: naoki

## Context

クライアントがサーバと通信する場面は現状「音声を送って、文字起こし・AI 応答・AI 音声を受け取る」の 1 つだけ。選択肢:

- 1 エンドポイントでまとめて返す
- STT / Chat / TTS を別エンドポイントに分け、クライアントが順に叩く
- SSE / WebSocket でストリーミングする

## Decision

`POST /api/chat` 1 本に集約し、同期レスポンスで `{ user_text, ai_text, ai_audio_base64 }` を返す。

## Consequences

- Pros
  - フロント実装が 1 往復で済み、状態管理がシンプル
  - ネットワーク往復が 1 回なので、総レイテンシが短い
  - 契約が小さいのでレビューしやすい
- Cons / Trade-offs
  - TTS が完了するまで何も返ってこない (部分的な先行表示ができない)
  - 音声データを base64 で JSON に埋めるので、バイナリ効率が落ちる (30% 程度膨張)
  - AI 応答のストリーミング (トークン単位の表示) はこの設計だとできない
- 波及する仕事
  - ストリーミング応答や、文字が先に出て音声が後から来る UX を入れる場合は ADR を起こし、SSE / WebSocket / 複数エンドポイントの構成に移行する

## Alternatives Considered

### Option A: STT / Chat / TTS を分けた 3 エンドポイント

- 段階的に UI を更新できる (文字起こしが出てから AI 応答を待つなど)
- ネットワーク往復が増え、失敗ポイントも増える
- 現状の UX 要求 (1 ターン対話) では過剰

### Option B: WebSocket / SSE でストリーミング

- LLM のトークンストリームを UI に逐次反映できる
- 実装・運用コストが高い
- 将来、応答の長さが伸びて「待ち時間の体感」が問題になったら移行する

### Option C: 音声は別の URL でダウンロード (S3 / BLOB への pre-signed URL)

- JSON サイズは小さくなる
- 別ストレージ依存が生まれる。今は base64 埋め込みで十分

## References

- `backend/app/routers/chat.py`
- `frontend/src/lib/api.ts`
