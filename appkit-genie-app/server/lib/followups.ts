import { aiConfig } from './aiConfig.js';
import { chat, forFeature, parseJsonObject } from './models.js';
import { inputPatterns } from './guardrails.js';

/**
 * Three suggested next questions after an answer, from a small model, used
 * when the query engine didn't suggest any itself (Agent mode never does).
 * Each suggestion goes through the same input pattern checks as a typed
 * question, so nothing that would be blocked is ever offered.
 */

const PROMPT = `You suggest follow-up questions for a telesales analytics assistant used by Optus's telesales leaders
(an Australian telecom provider; consultants are Concentrix). The data covers handled sales calls from 1 Nov 2025 to
20 Oct 2026 (today; 11 days left in October): call reasons, sales by Optus category (Postpaid Voice and Total Home new connections, Connected Devices,
Postpaid Voice and Home renewals), conversion against target, plan revenue, lost sales and why (Customer, People,
System), Jarvis system errors and tickets, cross-sell offered and taken up, first contact resolution,
transfers, repeat calls, callbacks, consultants, team leads, tenure, Elevate quality audits and states.
Suggest 3 short follow-up questions (under 90 characters each) that dig deeper into the answer below and
that this data can answer. Never suggest forecasts, credit scores, CSAT/NPS, queue wait times, device prices,
or anything about individual customers' personal details.
Write them in the same language as the user's question.
Reply with JSON only: {"questions": ["...", "...", "..."]}`;

export async function suggestFollowUps(question: string, answerText: string): Promise<string[]> {
  const cfg = aiConfig.followUps;
  if (!cfg || !answerText) return [];
  try {
    const { text } = await forFeature('follow_ups', () => chat(cfg.model, [
      { role: 'system', content: PROMPT },
      {
        role: 'user',
        content: `QUESTION:\n${question.slice(0, 600)}\n\nANSWER:\n${answerText.replace(/\[\[chart:[^\]]+\]\]/g, '').slice(0, 2500)}`,
      },
    ], { maxTokens: 200, timeoutMs: 8000 }));
    const j = parseJsonObject<{ questions?: unknown[] }>(text);
    return (j?.questions ?? [])
      .map((q) => String(q).replace(/\s+/g, ' ').trim())
      .filter((q) => q.length > 8 && q.length <= 140)
      .filter((q) => { const g = inputPatterns(q); return !g.blocked && !g.events.length; })
      .slice(0, 3);
  } catch (err) {
    console.warn('[follow-ups] failed:', err instanceof Error ? err.message : err);
    return [];
  }
}
