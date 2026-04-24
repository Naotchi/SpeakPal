# SpeakPal Documentation

SpeakPal の設計・開発ドキュメントの入り口。

## ドキュメントの種類

SpeakPal では 3 種類のドキュメントを使い分ける。役割が混ざると腐るので、書く前にどこに置くかを判断する。

| 種類 | 場所 | 役割 | 寿命 |
| --- | --- | --- | --- |
| **Overview** | `docs/*.md` | **現状**のシステムを説明する live document | コードと一緒に更新し続ける |
| **RFC** | `docs/rfcs/` | **これから作る**ものの提案（spec + 実装計画） | 提案〜実装完了まで。完了後も履歴として残す |
| **ADR** | `docs/adr/` | **決まった**設計判断の記録（なぜそれを選んだか） | 永続（変更時は新 ADR で Superseded） |

関係性: **RFC で提案 → 議論 → Accepted になったら実装 → 重要な設計判断は ADR に落とす**。

## Overview

システムの現在の姿を把握するためのドキュメント。コードや構成を変えたら同じ PR で更新する。

| ドキュメント | 内容 |
| --- | --- |
| [architecture.md](./architecture.md) | システム全体のアーキテクチャとコンポーネント責務 |
| [tech-stack.md](./tech-stack.md) | 採用している技術スタックとバージョン |
| [directory-structure.md](./directory-structure.md) | リポジトリのディレクトリ構成と配置ルール |
| [data-flow.md](./data-flow.md) | 音声入力から音声応答までのシーケンス |
| [development.md](./development.md) | 開発環境のセットアップと日々の作業手順 |

## RFC (Request for Comments)

新機能や大きな変更の**提案と実装計画**を置く場所。[docs/rfcs/](./rfcs/) を参照。

superpowers ワークフローとの対応:

- `/brainstorming` の成果 → RFC の **Spec** セクション
- `/writing-plans` の成果 → RFC の **Plan** セクション
- Accepted になった RFC を元に TDD で実装を進める

## ADR (Architecture Decision Record)

ライブラリ選定・API 設計・インフラなど、**後から変えると波及が大きい判断**を記録する場所。[docs/adr/](./adr/) を参照。

## 運用方針

- **コードから読み取れることは書かない**: ファイル名・関数名・行数は `git` で追える。ドキュメントは「なぜそうなっているか」「どう変えるべきか」を書く。
- **設計判断は必ず ADR に残す**: 採用した案だけでなく、検討した代替案と不採用理由まで書く。
- **コードと一緒に更新する**: Overview に影響する PR は、対応する docs の更新を同じ PR に含める。
