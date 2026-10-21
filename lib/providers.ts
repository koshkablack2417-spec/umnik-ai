export const providers = [
  { id: "openai", name: "Umik.6", description: "GPT-6 Luna · OpenAI", enabled: true },
] as const;

export type ProviderId = (typeof providers)[number]["id"];
