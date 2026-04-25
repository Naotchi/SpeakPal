# Superpowers ワークフロー成果物

SpeakPal は superpowers skills ベースで開発する。`/brainstorming` と `/writing-plans` の成果はそれぞれこのディレクトリ配下に置く。

## 構成

| ディレクトリ | 中身 | 生成元 skill |
| --- | --- | --- |
| [`specs/`](./specs/) | 何を作るかの仕様（要件・設計・代替案） | `superpowers:brainstorming` (`/brainstorming`) |
| [`plans/`](./plans/) | どう作るかの実装計画（タスク分解・チェックポイント） | `superpowers:writing-plans` (`/writing-plans`) |

## ファイル名規約

`YYYY-MM-DD-<slug>.md`。同じ機能の spec と plan は同じ slug を共有する。

例:

```
specs/2026-04-25-devcontainer-design.md
plans/2026-04-25-devcontainer.md
```

`<slug>` は spec 側で `-design` を付けるなど派生してよい（生成 skill のデフォルトに従う）。両者を相互リンクして対応関係を明示する。

## ワークフロー

1. **Spec を書く** — `/brainstorming` で要件・UX・代替案を詰め、`specs/` に保存
2. **Plan を書く** — `/writing-plans` で実装順序とチェックポイントを詰め、`plans/` に保存。spec へのリンクを冒頭に貼る
3. **実装する** — `/executing-plans`（または `/subagent-driven-development`）で plan を実行。実装中は `superpowers:test-driven-development` で Red → Green → Refactor を回す
4. **重要な設計判断は ADR に残す** — ライブラリ選定・API 契約・インフラなど後から変えると波及が大きい判断は [`docs/adr/`](../adr/) に記録

## Status 管理

ファイル内に Status フィールドは持たない。「いま何が走っているか」「何が完了したか」は git ログ・PR・コミットメッセージで追う。完了済みの spec / plan も**消さず**に残し、後から経緯を辿れるようにする。

## ADR との違い

| | superpowers/ | ADR |
| --- | --- | --- |
| 視点 | 前向き（これから作る） | 後ろ向き（決まったことを記録） |
| 内容 | spec + plan | 設計判断 + 代替案 + 不採用理由 |
| 起こすタイミング | 機能を作る前 | 設計判断が固まった時 |
| 関係 | spec の重要な判断は ADR に落として相互リンク | spec/plan を元に書かれることが多い |

小さい変更（バグ修正・小規模リファクタ）は spec/plan を経由しなくてよい。コミットと PR で十分。
