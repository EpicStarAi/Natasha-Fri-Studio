import { Router, type IRouter } from "express";
import { ChatBody, ChatResponse } from "@workspace/api-zod";
import { getClaudeClient } from "../lib/claude";

const router: IRouter = Router();

router.post("/chat", async (req, res) => {
  const parsed = ChatBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
    return;
  }

  const { messages } = parsed.data;

  const client = getClaudeClient();
  const response = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 1024,
    system:
      "Ты — умный AI-ассистент на медиаплатформе «Наташа Фри». " +
      "Отвечай кратко, по существу, на русском языке, если пользователь пишет по-русски.",
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  });

  const text = response.content.find((b) => b.type === "text")?.text ?? "";

  const data = ChatResponse.parse({ message: text });
  res.json(data);
});

export default router;
