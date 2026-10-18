export const providers = [
  { id: "gemini", name: "Gemini", description: "Google AI", enabled: true },
  { id: "openai", name: "ChatGPT", description: "OpenAI", enabled: false },
  { id: "claude", name: "Claude", description: "Anthropic", enabled: false },
  { id: "grok", name: "Grok", description: "xAI", enabled: false },
  { id: "qwen", name: "Qwen", description: "Alibaba Cloud", enabled: false },
] as const;

export type ProviderId = (typeof providers)[number]["id"];
