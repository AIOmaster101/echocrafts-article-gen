import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function callClaude(system: string, user: string): Promise<string> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8000,
    system,
    messages: [{ role: "user", content: user }],
  });
  return message.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");
}

export function parseJSON<T>(text: string): T | null {
  // Strip markdown fences first
  const stripped = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

  // Try direct parse
  try {
    return JSON.parse(stripped) as T;
  } catch {
    // Extract the outermost JSON object or array by brace/bracket matching
    const firstBrace = stripped.indexOf("{");
    const firstBracket = stripped.indexOf("[");
    const start =
      firstBrace === -1 ? firstBracket
      : firstBracket === -1 ? firstBrace
      : Math.min(firstBrace, firstBracket);

    if (start === -1) return null;

    const isArray = stripped[start] === "[";
    const open = isArray ? "[" : "{";
    const close = isArray ? "]" : "}";
    let depth = 0;
    let end = -1;
    for (let i = start; i < stripped.length; i++) {
      if (stripped[i] === open) depth++;
      else if (stripped[i] === close) {
        depth--;
        if (depth === 0) { end = i; break; }
      }
    }

    if (end === -1) return null;
    try {
      return JSON.parse(stripped.slice(start, end + 1)) as T;
    } catch {
      return null;
    }
  }
}
