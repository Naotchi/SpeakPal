# SpeakPal Documentation

SpeakPal の設計・開発ドキュメントの入り口。

## ドキュメントの種類

SpeakPal では役割の異なる 3 種類のドキュメントを使い分ける。書く前にどこに置くかを判断する。

| 種類 | 場所 | 役割 | 寿命 |
| --- | --- | --- | --- |
| **Overview** | `docs/*.md` | **現状**のシステムを説明する live document | コードと一緒に更新し続ける |
| **Spec / Plan** | [`docs/superpowers/`](./superpowers/) | **これから作る**ものの仕様と実装計画（superpowers skills の成果物） | 提案〜実装完了まで。完了後も履歴として残す |
| **ADR** | [`docs/adr/`](./adr/) | **決まった**設計判断の記録（なぜそれを選んだか） | 永続（変更時は新 ADR で Superseded） |

## 開発ワークフロー

新機能や大きな変更は **superpowers ワークフロー**に則って進める。各ステップで対応する skill を invoke する。

1. **Spec を固める** — `/brainstorming` (`superpowers:brainstorming`) で要件・UX・代替案を詰める。成果は [`docs/superpowers/specs/`](./superpowers/specs/) に `YYYY-MM-DD-<slug>.md` で保存
2. **Plan を書く** — `/writing-plans` (`superpowers:writing-plans`) で実装順序とチェックポイントを詰める。成果は [`docs/superpowers/plans/`](./superpowers/plans/) に保存し、spec へのリンクを冒頭に貼る
3. **実装する** — `/executing-plans` (`superpowers:executing-plans`)（または `/subagent-driven-development`）で plan を実行。実装中は `superpowers:test-driven-development` で Red → Green → Refactor を回す → [development.md の TDD サイクル](./development.md#tdd-サイクル)
4. **重要な設計判断を ADR に残す** — ライブラリ選定・API 契約・インフラなど後から変えると波及が大きい判断は [`docs/adr/`](./adr/) に記録（spec と相互リンク）

詳細は [`docs/superpowers/README.md`](./superpowers/README.md) を参照。

バグ修正や小さなリファクタは spec/plan を経由しなくてよい（コミットと PR で十分）。

## Overview

システムの現在の姿を把握するためのドキュメント。コードや構成を変えたら同じ PR で更新する。

| ドキュメント | 内容 |
| --- | --- |
| [architecture.md](./architecture.md) | システム全体のアーキテクチャとコンポーネント責務 |
| [tech-stack.md](./tech-stack.md) | 採用している技術スタックとバージョン |
| [directory-structure.md](./directory-structure.md) | リポジトリのディレクトリ構成と配置ルール |
| [data-flow.md](./data-flow.md) | 音声入力から音声応答までのシーケンス |
| [development.md](./development.md) | 開発環境のセットアップと日々の作業手順 |

## Spec / Plan

現在進行中・過去の機能提案と実装計画。superpowers skills の成果物。詳細は [`docs/superpowers/`](./superpowers/) を参照。

## ADR (Architecture Decision Record)

ライブラリ選定・API 設計・インフラなど、**後から変えると波及が大きい判断**を記録する場所。詳細は [`docs/adr/`](./adr/) を参照。

## 運用方針

- **コードから読み取れることは書かない**: ファイル名・関数名・行数は `git` で追える。ドキュメントは「なぜそうなっているか」「どう変えるべきか」を書く。
- **設計判断は必ず ADR に残す**: 採用した案だけでなく、検討した代替案と不採用理由まで書く。
- **コードと一緒に更新する**: Overview に影響する PR は、対応する docs の更新を同じ PR に含める。
