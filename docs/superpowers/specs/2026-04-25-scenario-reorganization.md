# シナリオを「AI から話しかけられる」前提で整理する

- Date: 2026-04-25
- Author: Naotchi

## Summary

「自由に話す」はユーザーから話し始め、それ以外のシナリオは AI 側から話し始める、という暗黙ルールを前提として、既存シナリオのラベルと役割を整理する。ラベルは「AI から動作を受ける」受動形のテンプレに統一し、矛盾していたシナリオ（道を尋ねる）は役割を反転、前提に合わないシナリオ（上司に有給を交渉）は削除する。データモデルや UI の構造は変更しない。

## Motivation

現在の `SCENARIOS`（`frontend/src/lib/scenarios.ts`）は、AI が先に話しかける `starter` を持つ一方で、ラベルはユーザー能動の表現になっており、両者が噛み合っていない。

- 「道を尋ねる」では、現行の starter は通行人（AI）が "Oh, hi! You look a bit lost — do you need some help finding something?" と声をかけるが、ラベル上はユーザーが尋ねる建前になっており、AI から話しかけるのは不自然（お節介な通行人に見える）。
- 「上司に有給を交渉」も、ユーザーが交渉するはずが starter は上司（AI）が "Hey, you wanted to chat? ..." と迎える形で、議題の主導権がどちらにあるか曖昧。

結果として、シナリオを選んだユーザーが「AI がしゃべり始めたが、何を返せばいいか」で迷いやすい。ラベル・starter・プロンプト・ユーザー役の整合を取り、「AI から話しかけられる → ユーザーはその場面の当事者として英語で応じる」という学習体験を明確にする。

## Spec (What)

### 前提ルール

- `free` シナリオのみユーザーから話し始める（starter なし）
- それ以外のシナリオは AI 側から `starter` で口火を切る
- このルールは暗黙の不変条件として扱い、型や UI では明示しない（最小限の変更に留める）

### ラベル命名テンプレ

非 free シナリオのラベルは **「[AI の役]に[AIからの動作]される」形の受動文** に統一する。ユーザーが何を受け身で経験するかが一目で分かる形。

### 最終ラインナップ（5 件）

| # | emoji | label | speakerName | 役割 |
| --- | --- | --- | --- | --- |
| 1 | 💬 | 自由に話す | (free-talk partner) | ユーザー先行 |
| 2 | 🛫 | 空港の係員に案内される | Check-in Agent | AI=係員、ユーザー=旅行者 |
| 3 | 🍽️ | レストランで店員に声をかけられる | Server | AI=店員、ユーザー=客 |
| 4 | 👋 | パーティで話しかけられる | Alex | AI=初対面の Alex、ユーザー=対等な参加者 |
| 5 | 🗺️ | 観光客に道を尋ねられる | Tourist | **AI=道に迷った観光客、ユーザー=地元民（役割反転）** |

現行からの差分:

- `pto-negotiation`（📅 上司に有給を交渉）を **削除**。AI 先行前提と噛み合わず、議題の主導権が曖昧になるため。
- `asking-directions`（🗺️ 道を尋ねる）を **役割反転し、id を `giving-directions` に変更**。ラベルは「観光客に道を尋ねられる」、ユーザーは地元民として英語で道案内する。
- 残り 3 件（airport-checkin / restaurant-order / self-intro）は、ラベルと description を受動形に書き換えるが、promptSnippet・starter・speakerName・emoji は現状維持。

### 各シナリオの具体定義

すべて `frontend/src/lib/scenarios.ts` の `SCENARIOS` 配列に反映する。

#### 1. 💬 自由に話す（変更なし）

```ts
{
  id: FREE_TALK_ID,
  label: "自由に話す",
  emoji: "💬",
  description: "場面を決めずに気軽におしゃべり",
  promptSnippet: "",
  starter: "",
  speakerName: "",
}
```

#### 2. 🛫 空港の係員に案内される

```ts
{
  id: "airport-checkin",
  label: "空港の係員に案内される",
  emoji: "🛫",
  description: "海外空港のカウンターで係員に搭乗手続きを進めてもらう",
  // promptSnippet は現行を維持
  starter:
    "Good afternoon! Welcome to the check-in counter. May I see your passport and ticket, please?",
  speakerName: "Check-in Agent",
}
```

#### 3. 🍽️ レストランで店員に声をかけられる

```ts
{
  id: "restaurant-order",
  label: "レストランで店員に声をかけられる",
  emoji: "🍽️",
  description: "海外のレストランで店員に注文をとってもらう",
  // promptSnippet は現行を維持
  starter: "Hi there, welcome in! Can I start you off with something to drink?",
  speakerName: "Server",
}
```

#### 4. 👋 パーティで話しかけられる

```ts
{
  id: "self-intro",
  label: "パーティで話しかけられる",
  emoji: "👋",
  description: "初対面の相手から声をかけられ、自己紹介を交わす",
  // promptSnippet は現行を維持
  starter: "Hi! I don't think we've met before. I'm Alex — nice to meet you!",
  speakerName: "Alex",
}
```

#### 5. 🗺️ 観光客に道を尋ねられる（役割反転・全面書き直し）

```ts
{
  id: "giving-directions",
  label: "観光客に道を尋ねられる",
  emoji: "🗺️",
  description: "街中で観光客に呼び止められ、目的地までの行き方を英語で案内する",
  promptSnippet:
    "You are a foreign tourist visiting an English-speaking city where the user lives. " +
    "You are a bit lost and just stopped the user on the street to ask for directions " +
    "to a specific landmark (pick one naturally — train station, a famous museum, a well-known park, etc.). " +
    "The user is a local resident helping you in English. " +
    "Listen to their directions, ask natural follow-up questions if something is unclear " +
    "(distance, which side of the street, whether you can walk or should take transit), " +
    "and thank them naturally when you understand. Stay in role as the tourist.",
  starter:
    "Excuse me, sorry to bother you — do you happen to know how to get to the train station from here?",
  speakerName: "Tourist",
}
```

### 変更範囲・非変更範囲

**変更するもの**:

- `frontend/src/lib/scenarios.ts` の `SCENARIOS` 配列のみ

**変更しないもの**:

- `Scenario` 型（`initiator` / `userRoleHint` などのフィールドは追加しない）
- `FREE_TALK_ID` / `loadScenarioId` / `saveScenarioId` / `getScenario`
- バックエンド（`promptSnippet` は従来どおり `persona` として `POST /api/chat/stream` に送られる）
- UI コンポーネント（`ScenarioPicker` / `ScenarioChip` / `ChatMessage` など）
- `PartnerSettings` / free-talk 側の設定

### 既存ユーザーへの影響

`loadScenarioId()` は localStorage の値が `SCENARIOS` に無ければ `FREE_TALK_ID` にフォールバックする:

```ts
return SCENARIOS.some((s) => s.id === raw) ? raw : FREE_TALK_ID;
```

よって:

- `speakpal.scenarioId = "pto-negotiation"` を保存していたユーザー → 次回起動時に「自由に話す」へフォールバック（エラーなし）
- `speakpal.scenarioId = "asking-directions"` を保存していたユーザー → 同様にフォールバック
- チャット履歴は localStorage に保存していないため、進行中の会話への影響なし
- SRS（`speakpal.srsItems`）はシナリオ id に依存しないため無影響

バックエンドや外部システムに保存されている状態はないため、マイグレーションは不要。

### 動作確認

フロントのユニットテストは未整備のため、手動確認でカバーする:

1. シナリオピッカーで 5 件表示され、「📅 上司に有給を交渉」が消えている
2. 各シナリオのラベル・説明が新しい文言になっている
3. 🗺️「観光客に道を尋ねられる」を選ぶと、AI の starter メッセージ "Excuse me, sorry to bother you..." がチャットに追加される（現行実装では starter はテキストのみで自動音声再生はしない。本 spec の範囲外）
4. 🗺️ で英語で道案内を話すと、AI（Tourist）が追質問を返し、地元民として応答する文脈が成立する
5. 他 3 件（airport / restaurant / self-intro）は従来通りの会話が成立する
6. ブラウザの localStorage に `speakpal.scenarioId = "pto-negotiation"` や `"asking-directions"` を仕込んだ状態でリロードし、「自由に話す」状態で起動する

### 非機能要件

- パフォーマンス: 影響なし（静的配列の中身を差し替えるのみ）
- コスト: 影響なし
- 互換性: 上記の通り、古い `scenarioId` は自動的に `free` にフォールバックされる

## Drawbacks / Trade-offs

- **学習機会の減少**: 「上司に有給を交渉」シナリオは、ユーザーが能動的に議題を切り出す練習として価値があったが、今回削除する。該当のニーズが残っていれば、別 spec で「AI 先行だが議題をユーザーが持ち出す」設計を検討する。
- **ラベルの抽象度の上下**: 受動形統一で「レストランで店員に声をかけられる」はやや説明的になる。チップ表示での情報密度が増える点は許容する。
- **id 変更による localStorage リセット**: `asking-directions` を使っていたユーザーは次回「自由に話す」状態で起動する。頻度が低く影響も軽微と判断。

## Alternatives Considered

### Option A: `initiator: "user" | "ai"` フィールドをスキーマに追加し、UI バッジで明示する

- 型で不変条件を固定でき、将来「AI 先行だがユーザー主導議題」のような新パターンを入れる余地が残る
- 今回の範囲では型変更に見合う UI 要件がなく、過剰設計になるため不採用

### Option B: ブリーフィング画面を挟む（シナリオ選択 → 役割説明 → 開始）

- 🗺️ のような役割反転シナリオの理解度は上がる
- 1 タップ増えるコストと、現時点で反転シナリオが 1 件しかないことから不採用。ラベルと AI の starter だけで役割は推測可能と判断。

### Option C: 新規シナリオ追加（ホテル・タクシー・面接・医者など）を同時に行う

- ラインナップ拡充は将来やりたいが、今回の焦点は「既存ラインナップの整合性を取る」ことに絞る
- バックログの「シナリオ拡張」として別 spec で扱う

### Option D: 「上司」シナリオを評価面談や 1on1 に差し替えて残す

- AI 先行が自然になり、受動形テンプレにも収まる
- 現状の有給交渉プロンプトを失うコストに対して、新トピックの学習価値が未検証のため、今回は削除に留める。必要が出たら別 spec で追加。

## Unresolved Questions

- なし（スキーマ変更も UI 変更もないため、実装上の論点は `/writing-plans` フェーズで詰める）

## References

- `frontend/src/lib/scenarios.ts` — 現行シナリオ定義
- `frontend/src/app/page.tsx` — シナリオ ID のロード・保存・AI starter 表示ロジック
- `backend/app/routers/chat.py` — `persona` フォームフィールドを受け取って LLM へ渡す箇所
- 実装計画: [`docs/superpowers/plans/2026-04-25-scenario-reorganization.md`](../plans/2026-04-25-scenario-reorganization.md)
