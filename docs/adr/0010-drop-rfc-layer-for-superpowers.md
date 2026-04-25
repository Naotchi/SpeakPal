# 0010. RFC 層を廃止し superpowers/specs+plans に一本化する

- Status: Accepted
- Date: 2026-04-25
- Deciders: naoki

## Context

[ADR 0009](./0009-docs-rfc-adr-split.md) でドキュメントを Overview / RFC / ADR の 3 層に分けた。RFC は `docs/rfcs/NNNN-<slug>.md` の単一ファイル内に `## Spec` / `## Plan` セクションを持ち、`/brainstorming` と `/writing-plans` の成果をそれぞれ落とす運用にしていた。

しかし実運用に入ってみたら、別ルートで spec / plan が生まれていた:

- devcontainer 機能では `docs/superpowers/specs/2026-04-25-devcontainer-design.md` と `docs/superpowers/plans/2026-04-25-devcontainer.md` の 2 ファイルに直接出力された（RFC ファイルは作られなかった）
- scenario reorganization 機能では `docs/rfcs/0001-scenario-reorganization.md` の 1 ファイルに spec + plan が並んだ

同じ目的の成果物が 2 つの置き場（`docs/rfcs/` と `docs/superpowers/`）に分かれて運用が割れた。RFC ファイルは「spec + plan + Status」の容器でしかなく、その中身は superpowers skills が生成する spec と plan そのもの。容器と中身を別々に管理する必然性が無いとわかった。

## Decision

`docs/rfcs/` を廃止し、spec と plan は `docs/superpowers/specs/` と `docs/superpowers/plans/` の 2 ディレクトリに直接置く運用に一本化する。

具体的なルール:

- spec は `docs/superpowers/specs/YYYY-MM-DD-<slug>.md`、plan は `docs/superpowers/plans/YYYY-MM-DD-<slug>.md`
- 同一機能の spec と plan は同じ `<slug>` を共有し、冒頭で相互リンクする
- Status はファイル内に持たず、git ログ・PR・コミットメッセージで追う
- 既存の `docs/rfcs/0001-scenario-reorganization.md` は spec と plan に分割して移行（同 PR で実施）
- 重要な設計判断（ライブラリ選定・API 契約など）が含まれる場合は別途 ADR を起こして相互リンクする運用は継続

## Consequences

- Pros
  - spec / plan の置き場が 1 箇所に統一される（運用が割れない）
  - superpowers skills の出力先と保存先が一致するので、`/executing-plans` から spec / plan を読む経路がシンプル
  - Status 管理という追加の規律を廃止できる（git で十分）
  - ドキュメント種類が 3 → 2 + 作業ディレクトリに減り、判断負荷が下がる
- Cons / Trade-offs
  - 「Implemented」のような Status ラベルが消えるため、特定の spec が完了済みかは git ログを辿らないとわからない（ソロ開発スケールでは許容範囲）
  - Rust RFC / PEP 風の連番（`NNNN-<slug>`）を捨てるので、外部からの「RFC #N」のような短い参照名が使えなくなる
- 波及する仕事
  - `docs/rfcs/` ディレクトリと配下のファイルを削除（本 ADR とセットで実施）
  - `docs/rfcs/0001-scenario-reorganization.md` を `docs/superpowers/specs/2026-04-25-scenario-reorganization.md` と `docs/superpowers/plans/2026-04-25-scenario-reorganization.md` に分割
  - `docs/superpowers/README.md` を新設してワークフローと運用ルールを記述
  - `docs/README.md` を 3 層 → 2 層 + superpowers ワークフローに更新
  - `CLAUDE.md` のドキュメント運用説明を更新
  - ルートの `README.md` のドキュメント表で `docs/rfcs/` を `docs/superpowers/` に置き換え

## Alternatives Considered

### Option A: ADR 0009 のまま 3 層運用を続け、devcontainer の spec / plan を RFC に集約しなおす

- ADR 0009 を覆さずに済む
- ただし superpowers skills のデフォルト出力先が `docs/superpowers/specs/` と `docs/superpowers/plans/` であるため、毎回 RFC ファイルへ手作業で集約する手間が発生する。skill のデフォルトと運用が食い違うのは持続しない
- skill 側を上書きして RFC 形式で出力させる手もあるが、skill のメンテに引きずられるコストが見合わない

### Option B: RFC 層は残し、`docs/superpowers/` を draft 専用の作業領域として明示する

- skill の出力は draft、RFC が canonical という階層にする
- 二重管理になる。draft → RFC への転記コストが毎回発生し、忘れると不整合が生まれる
- 0001-scenario と devcontainer で既にこのコストを払えていない事実から、運用が定着しないと判断

### Option C: RFC 層も superpowers 層も廃止し、すべて ADR で扱う

- ADR 0009 の Option A と同じで却下済み。ADR は「決定の記録」であり、提案フェーズの spec や手順を書く器としては重い

### Option D: spec と plan を 1 ファイルに統合する（`docs/superpowers/NNNN-<slug>.md`）

- ADR 0009 で採用していた RFC 形式に戻ることになる
- spec と plan を別ファイルにする方が superpowers skills のデフォルトと一致し、それぞれ独立して更新しやすい
- 1 ファイル統合のメリット（相互参照のしやすさ）は冒頭の相互リンクで十分代替できる

## References

- [ADR 0009](./0009-docs-rfc-adr-split.md): 本 ADR が Supersede した 3 層運用の決定
- [`docs/superpowers/README.md`](../superpowers/README.md): 新運用のワークフローと規約
- memory: `feedback_superpowers_workflow.md`（superpowers 採用の決定）
