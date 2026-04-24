# ディレクトリ構成

## トップレベル

```
SpeakPal/
├── backend/              # FastAPI アプリ (Python)
├── frontend/             # Next.js アプリ (TypeScript)
├── docs/                 # 設計ドキュメント (ADR 含む)
├── docker-compose.yml    # 開発用の 2 サービス構成
├── README.md             # プロダクト概要 + docs の入口
└── .gitignore
```

バックエンドとフロントエンドは**別リポジトリに分けない**方針。理由は [adr/0001-monorepo-docker-compose.md](./adr/0001-monorepo-docker-compose.md) を参照。

## backend/

```
backend/
├── Dockerfile
├── requirements.txt
├── .env.example          # 必要な環境変数のひな形 (.env はコミット禁止)
└── app/
    ├── __init__.py
    ├── main.py           # FastAPI アプリ定義・CORS・ルーター登録
    ├── routers/          # HTTP エンドポイント層
    │   └── chat.py       # POST /api/chat
    └── services/         # 外部サービス呼び出し (純粋関数的に保つ)
        ├── speech_to_text.py
        ├── conversation.py
        └── text_to_speech.py
```

### 配置ルール

- **routers/**: HTTP リクエスト/レスポンスの組み立てのみ。ビジネスロジックや外部 API 呼び出しを直接書かない。例外を HTTPException に翻訳するのもここ。
- **services/**: 1 ファイル = 1 外部サービスまたは 1 ドメインロジック。HTTP 層に依存しない (`Request`, `HTTPException` などを import しない)。
- **main.py**: アプリのエントリポイントと横断設定 (CORS, ロギング, ルーター登録) のみ。ドメインロジックは書かない。

新しいエンドポイントを追加するときは、`routers/xxx.py` を作り `main.py` で `include_router` する。外部サービスが増えたら `services/xxx.py` を足す。

将来増えそうなディレクトリ:
- `models/` … Pydantic モデルが増えたら切り出す (今は `routers/` にインラインで書く程度で十分)
- `core/` … 設定読み込み、DI、ロギング設定などが複雑化したら
- `tests/` … テストを追加する際に

## frontend/

```
frontend/
├── Dockerfile
├── next.config.ts
├── package.json
├── tsconfig.json
├── postcss.config.mjs
├── .env.local.example
└── src/
    ├── app/              # Next.js App Router のルート
    │   ├── layout.tsx    # ルートレイアウト
    │   ├── page.tsx      # トップページ (/)
    │   └── globals.css
    ├── components/       # プレゼンテーショナル React コンポーネント
    ├── hooks/            # カスタムフック
    └── lib/              # API クライアント等の純粋ロジック
```

### 配置ルール

- **app/**: ルーティングに紐づくファイルだけ。ページ固有の UI 構成は `page.tsx` に書き、部品化したくなったら `components/` に切り出す。
- **components/**: ステートレスな表示部品。データ取得は行わず、props で受け取る。`"use client"` を明示する (親が client ならトップに書けば伝播する)。
- **hooks/**: ブラウザ API や副作用のラップ。`useAudioRecorder` のように単独でテスト可能に保つ。
- **lib/**: フレームワーク非依存のロジック (API クライアント, フォーマッタ等)。React を import しない。

新しいページを追加するときは `app/<route>/page.tsx` を作る。ページ間で共有する部品は `components/` に昇格させる。

将来増えそうなディレクトリ:
- `types/` … API レスポンス型などが増えた場合
- `features/` … 機能単位でコンポーネント + フック + ロジックをまとめたくなったら

## docs/

```
docs/
├── architecture.md
├── tech-stack.md
├── directory-structure.md   # このファイル
├── data-flow.md
├── development.md
└── adr/
    ├── README.md
    ├── template.md
    └── NNNN-<slug>.md        # 連番。欠番を作らない
```

ADR の運用は [adr/README.md](./adr/README.md) を参照。
