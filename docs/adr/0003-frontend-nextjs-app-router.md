# 0003. フロントエンドは Next.js 15 App Router

- Status: Accepted
- Date: 2026-04-19
- Deciders: naoki

## Context

クライアント側の要件:

- ブラウザのマイク API を使う (完全に client-side の処理)
- チャット UI と音声再生ができれば十分
- 将来的にページ追加 (設定画面、履歴一覧など) がありえる
- デプロイ先はまだ決めていない (Vercel / 自前コンテナどちらも残したい)

## Decision

Next.js 15 + React 19 を App Router で採用する。トップレベルのページ (`src/app/page.tsx`) は `"use client"` で運用。

## Consequences

- Pros
  - ルーティング・ビルド・dev server が一式揃っていて個人開発の立ち上げが速い
  - 将来 SSR / RSC が必要になってもそのまま移行できる
  - Vercel デプロイのオプションを残せる
- Cons / Trade-offs
  - 現状は SPA 的な使い方しかしていないので、Next.js の多くの機能は未活用
  - App Router 特有の挙動 (キャッシュ、RSC 境界) を意識する必要がある場面が将来出る
- 波及する仕事
  - 認証やサーバコンポーネントを入れる時に改めて設計

## Alternatives Considered

### Option A: Vite + React (SPA)

- 軽量で、現状の要件には十分
- ただしページ追加や SEO 対応の余地を考えると Next.js の方が後々ラク

### Option B: Remix

- フルスタックフレームワークとして良い選択
- コミュニティ規模とドキュメント量で Next.js を優先

### Option C: 純粋な HTML + TypeScript

- 依存を極小にできるが、UI 反復のスピードが落ちる

## References

- `frontend/package.json`
- `frontend/src/app/`
