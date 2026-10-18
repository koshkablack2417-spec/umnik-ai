export const providers = [
  { id: "gemini", name: "Gemini", description: "Google AI", enabled: true },
  { id: "openai", name: "ChatGPT", description: "OpenAI", enabled: true },
  { id: "claude", name: "Claude", description: "Anthropic", enabled: true },
  { id: "grok", name: "Grok", description: "xAI", enabled: true },
  { id: "qwen", name: "Qwen", description: "Alibaba Cloud", enabled: true },
] as const;

export type ProviderId = (typeof providers)[number]["id"];
