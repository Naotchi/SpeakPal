# 0002. バックエンドは FastAPI + Uvicorn

- Status: Accepted
- Date: 2026-04-19
- Deciders: naoki

## Context

バックエンドの役割は「音声を受け取り、Azure の複数サービスを順番に叩いて結果を返す」オーケストレーション。要件は:

- `multipart/form-data` で音声ファイルを受け取る
- 外部 API 呼び出しがあるので非同期 I/O が使える方が無駄がない
- Python エコシステムに寄せたい (Azure SDK、OpenAI SDK、ffmpeg バインディング等)

## Decision

FastAPI + Uvicorn を採用する。

## Consequences

- Pros
  - 型ヒント + Pydantic で入出力のバリデーションが自動化される
  - `async def` で非同期ハンドラが自然に書ける
  - `UploadFile` で multipart がそのまま扱える
  - ドキュメント (`/docs`) が自動生成される
- Cons / Trade-offs
  - 同期ブロッキング API (Azure Speech SDK, OpenAI SDK の同期呼び出し) を使うときは `asyncio.to_thread` で逃がす必要がある
  - DI コンテナ等が必要になったら別途設計が要る
- 波及する仕事
  - 外部 API 呼び出しが増えるほど `services/` の分離ルールが効いてくる

## Alternatives Considered

### Option A: Flask

- 同期中心。外部 API を並列で叩きたくなった時に不利
- 型ヒント連携が FastAPI ほど強くない

### Option B: Node.js (Express / Hono)

- フロントと言語を揃えられるのは利点
- 一方で Azure Speech SDK の Python 版が SDK として成熟しており、今回の用途では Python の方が楽

### Option C: Go (gin / echo)

- 性能は高いが、LLM / 音声系 SDK のエコシステムが Python ほど豊富ではない
- 個人開発の速度を優先

## References

- `backend/app/main.py`
