# 0009. ドキュメント運用を Overview / RFC / ADR の 3 層に分ける

- Status: Accepted
- Date: 2026-04-25
- Deciders: naoki

## Context

これまで `docs/` 配下には live document（`architecture.md` など flat なファイル）と ADR（`docs/adr/`）の 2 種類しか無かった。SpeakPal の開発フローを superpowers ベース（`/brainstorming` → `/writing-plans` → TDD で実装）に移行する（[memory: feedback_superpowers_workflow.md](../../../.claude/projects/-home-naoki-SpeakPal/memory/feedback_superpowers_workflow.md)）にあたり、新たに 2 種類の作業成果物が定常的に発生する:

- `/brainstorming` の成果 = **spec**（何を作るかの仕様）
- `/writing-plans` の成果 = **実装計画**（どう作るかの手順）

これらを既存のどこに置くかが曖昧だった。候補は 3 つあった:

1. ADR に押し込む — ADR の役割（決定の記録）と提案フェーズの spec / plan は性質が違うので混ざる
2. flat な `docs/*.md` に置く — 「現状を説明する live document」と「提案中の作業ノート」が混在し、どれが現在の事実かわからなくなる
3. 新しいカテゴリを作る — 役割が分離できる

加えて、業界的にデファクトな分類があるかも検討した。`docs/adr/` は Michael Nygard 形式として既に標準。`docs/rfcs/` は Rust RFC / Python PEP / IETF と同じ「これから作るものの提案」を置くパターンとして十分定着している。

## Decision

ドキュメントを 3 層に分け、それぞれ役割と寿命を明確にする:

| 種類 | 場所 | 役割 | 寿命 |
| --- | --- | --- | --- |
| Overview | `docs/*.md` | 現状のシステムを説明する live document | コードと一緒に更新し続ける |
| RFC | `docs/rfcs/` | これから作るものの提案（spec + 実装計画） | 提案〜実装完了まで。完了後も `Implemented` 状態で残す |
| ADR | `docs/adr/` | 決まった設計判断の記録 | 永続。変更時は新 ADR で `Superseded` |

具体的なルール:

- RFC は `docs/rfcs/NNNN-<slug>.md` の単一ファイル。テンプレートに `## Spec` / `## Plan` セクションを持ち、`/brainstorming` と `/writing-plans` の成果をそれぞれ落とす
- RFC の Status は `Draft` → `In Review` → `Accepted` → `Implemented`（または `Rejected`）の 4 段階
- RFC が Accepted になった時点で重要な設計判断（ライブラリ選定・API 契約など）が含まれる場合、別途 ADR を起こして相互リンクする
- 既存の flat な `docs/*.md`（architecture / data-flow / development / tech-stack / directory-structure）は live document として位置づけを明確化し、`docs/README.md` を新設してインデックスにする
- 既存 ADR の運用（`NNNN-<slug>.md` 連番、`template.md` ベース、書き換え禁止）はそのまま継続

## Consequences

- Pros
  - 「現状の事実」「これから作る提案」「過去に決めたこと」が物理的に分離され、どれを参照すべきかが明確になる
  - superpowers の `/brainstorming` `/writing-plans` の成果に固定の置き場ができ、セッションをまたいで `/executing-plans` から参照しやすい
  - RFC を git にコミットすることで PR でレビュー可能・GitHub 上で履歴を追える
  - Rust RFC / PEP と同じ命名・構造なので、外部のコントリビューターにも意図が伝わりやすい
- Cons / Trade-offs
  - 種類が 3 つに増えるため、書く前に「これは Overview か RFC か ADR か」を判断する必要がある（→ `docs/README.md` の表で簡潔に判別できるようにする）
  - RFC と ADR で内容が一部重複しうる（spec を書いてから ADR で同じ判断を再記述するケース）。割り切って許容する
  - 完了済み RFC が累積していくため、長期的には `archive/` への移動など整理が必要になる可能性
- 波及する仕事
  - `docs/README.md` を新設してインデックス化（本 ADR とセットで実施）
  - `docs/rfcs/README.md` と `docs/rfcs/template.md` を新設（本 ADR とセットで実施）
  - ルートの `README.md` のドキュメント表に `docs/README.md` と `docs/rfcs/` を追記
  - 今後の機能追加（バックログのリトライ・シナリオ拡張・SRS 改良など）は最初に RFC を起こす運用に切り替え

## Alternatives Considered

### Option A: ADR だけで運用し、RFC を作らない

- 全ての提案を ADR の `Proposed` Status で書き、Accepted/Rejected で確定させる
- ADR は「決定の記録」が本来の役割で、検討中の spec や手順を書く器としては重い。連番を消費する単位もズレる（小さな提案でも ADR 番号を取ることになる）
- superpowers の `/brainstorming` と `/writing-plans` の成果を ADR の Context に詰め込むと肥大化する

### Option B: `docs/proposals/` と `docs/plans/` を分ける

- spec（提案）と plan（実装計画）を別ディレクトリにする
- 1 つの機能に対して 2 ファイル管理になり、相互参照のメンテが手間
- ソロ開発では spec と plan が密結合に進化するので、同じ RFC ファイル内でセクション分けする方が自然

### Option C: plan を `.gitignore` してローカルのみで管理

- リポジトリが汚れない
- `/executing-plans` は別セッションで plan を読み返すので、ファイルが安定して存在する場所が必要。ローカル限定だとセッション再開や他環境からの参照ができない
- レビューもされないので品質チェックの機会が減る

### Option D: 機能ごとにサブディレクトリ（`docs/rfcs/NNNN-feature/spec.md` + `plan.md`）

- 大規模な提案（複数ファイルに渡る設計図など）を整理しやすい
- 現時点の SpeakPal の規模では過剰。1 ファイルで済むものを分けると `cd` の往復が増える
- 必要になった時点で個別 RFC で「このディレクトリ構造で進める」と書けば済む（後から拡張可能）

## References

- `docs/README.md`（本 ADR とセットで新設）
- `docs/rfcs/README.md`（本 ADR とセットで新設）
- `docs/rfcs/template.md`（本 ADR とセットで新設）
- [0001](./0001-monorepo-docker-compose.md)（リポジトリ構成）
- memory: `feedback_superpowers_workflow.md`（superpowers 採用の決定）
- 外部参照: [Michael Nygard, Documenting Architecture Decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions) / [Rust RFC process](https://github.com/rust-lang/rfcs)
