export const providers = [
  { id: "openai", name: "ChatGPT 6 Luna", description: "GPT-6 Luna · OpenAI", enabled: true },
] as const;

export type ProviderId = (typeof providers)[number]["id"];
