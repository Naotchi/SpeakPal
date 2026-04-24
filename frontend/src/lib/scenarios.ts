export interface Scenario {
  id: string;
  label: string;
  emoji: string;
  description: string;
  promptSnippet: string;
  starter: string;
  speakerName: string;
}

export const FREE_TALK_ID = "free";

export const SCENARIOS: Scenario[] = [
  {
    id: FREE_TALK_ID,
    label: "自由に話す",
    emoji: "💬",
    description: "場面を決めずに気軽におしゃべり",
    promptSnippet: "",
    starter: "",
    speakerName: "",
  },
  {
    id: "airport-checkin",
    label: "空港の係員に案内される",
    emoji: "🛫",
    description: "海外空港のカウンターで係員に搭乗手続きを進めてもらう",
    promptSnippet:
      "You are a check-in agent at an international airport counter. " +
      "The user is a Japanese traveler checking in for an international flight. " +
      "Guide them through the standard check-in flow naturally: passport, destination, " +
      "number of bags, seat preference, and any typical follow-up questions. " +
      "Stay in role as the agent throughout.",
    starter:
      "Good afternoon! Welcome to the check-in counter. May I see your passport and ticket, please?",
    speakerName: "Check-in Agent",
  },
  {
    id: "restaurant-order",
    label: "レストランで店員に声をかけられる",
    emoji: "🍽️",
    description: "海外のレストランで店員に注文をとってもらう",
    promptSnippet:
      "You are a friendly server at a mid-range restaurant abroad. " +
      "The user is a Japanese customer who just sat down. " +
      "Take their order step by step: drinks, appetizer, main course, and any dietary needs. " +
      "Recommend dishes when asked and stay in role as the server.",
    starter:
      "Hi there, welcome in! Can I start you off with something to drink?",
    speakerName: "Server",
  },
  {
    id: "self-intro",
    label: "パーティで話しかけられる",
    emoji: "👋",
    description: "初対面の相手から声をかけられ、自己紹介を交わす",
    promptSnippet:
      "You are meeting the user for the first time at a casual social setting " +
      "(a party, a meetup, or an international event). " +
      "Exchange introductions: name, where you're from, what you do, hobbies, and so on. " +
      "Ask natural follow-up questions about the user's background.",
    starter:
      "Hi! I don't think we've met before. I'm Alex — nice to meet you!",
    speakerName: "Alex",
  },
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
  },
];

const STORAGE_KEY = "speakpal.scenarioId";

export function loadScenarioId(): string {
  if (typeof window === "undefined") return FREE_TALK_ID;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return FREE_TALK_ID;
    return SCENARIOS.some((s) => s.id === raw) ? raw : FREE_TALK_ID;
  } catch {
    return FREE_TALK_ID;
  }
}

export function saveScenarioId(id: string): void {
  window.localStorage.setItem(STORAGE_KEY, id);
}

export function getScenario(id: string): Scenario | null {
  return SCENARIOS.find((s) => s.id === id) ?? null;
}
