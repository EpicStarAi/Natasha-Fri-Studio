import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;

export function getClaudeClient(): Anthropic {
  if (!_client) {
    if (!process.env["ANTHROPIC_API_KEY"]) {
      throw new Error(
        "ANTHROPIC_API_KEY environment variable is required but was not provided.",
      );
    }
    _client = new Anthropic({ apiKey: process.env["ANTHROPIC_API_KEY"] });
  }
  return _client;
}
