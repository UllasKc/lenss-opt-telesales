/**
 * The suggested questions: the six tiles on an empty chat, plus four more in
 * the side panel (five per mode). One list, served to the front end and used
 * to pre-warm the answer cache. Built from the telesales workbook's
 * Sample_BI_Questions and Scenario Guide; check each against the live Genie
 * space before a demo.
 */
export interface Suggestion {
  mode: 'chat' | 'agent';
  label: string;
  q: string;
}

export const STARTERS: Suggestion[] = [
  { mode: 'chat', label: 'Yesterday, and our pace to target', q: 'How did we do yesterday, and are we on pace for target this month?' },
  { mode: 'chat', label: 'Weekly conversion by product', q: 'Show weekly conversion for Postpaid Voice and Home new connections over the last 8 weeks.' },
  { mode: 'chat', label: 'Calls in each scenario', q: 'How many calls are in each scenario last month?' },
  { mode: 'agent', label: 'Why are we behind target?', q: 'We are behind the new sales conversion target. Why, and what should we fix first?' },
  { mode: 'agent', label: 'Why does mobile convert less than NBN?', q: 'Why does mobile convert so much less than NBN, and what should we change on mobile calls?' },
  { mode: 'agent', label: 'Who should we coach first?', q: 'Which consultants should we coach first, and on what: discovery, ownership or cross-sell?' },
];

export const MORE_SUGGESTIONS: Suggestion[] = [
  { mode: 'chat', label: 'Sales lost to Jarvis', q: 'How many sales were lost to Jarvis errors this month, and what is the conversion impact in points?' },
  { mode: 'chat', label: 'NBN sales with no mobile offer', q: 'How many NBN sales last month had no mobile cross-sell offered, and what would a 20% take-up be worth?' },
  { mode: 'agent', label: 'Do lost customers come back?', q: 'Do customers we lose come back and buy? What should consultants do differently on the first call?' },
  { mode: 'agent', label: 'How do we close the gap?', q: 'How do we close the gap to the new sales conversion target? Rank the levers and say who owns each.' },
];

export const ALL_SUGGESTIONS: Suggestion[] = [...STARTERS, ...MORE_SUGGESTIONS];

/**
 * Quick-start prompts: one-click analyses shown on the Assistant's welcome screen
 * and at the top of the prompts panel (icon, category, title, one-line description).
 */
export interface QuickStart { icon: string; category: string; title: string; desc: string; q: string; mode: 'chat' | 'agent' }

export const QUICK_START: QuickStart[] = [
  { icon: 'gap', category: 'Performance', title: 'Why we are behind target', desc: 'The gap, where sales are lost, what to fix first', mode: 'agent',
    q: 'We are behind the new sales conversion target. Why, and what should we fix first?' },
  { icon: 'alert', category: 'Systems', title: 'What Jarvis is costing us', desc: 'Blocked sales, error types and ticket times', mode: 'agent',
    q: 'How many sales did Jarvis errors cost last month, which errors matter most, and how long do tickets take?' },
  { icon: 'cash', category: 'Cross-sell', title: 'The mobile sale on NBN calls', desc: 'Opportunities not offered, take-up, value', mode: 'agent',
    q: 'How many NBN sales last month had no mobile cross-sell offered, and what would offering it every time be worth?' },
  { icon: 'promise', category: 'First call', title: 'Lost on the first call', desc: 'Lost sales, callbacks and repeat calls', mode: 'agent',
    q: 'Do customers we lose come back and buy? Are promised callbacks being kept?' },
  { icon: 'shield', category: 'Coaching', title: 'Who to coach first', desc: 'Lowest converters, discovery scores, cross-sell', mode: 'agent',
    q: 'Which consultants should we coach first, and on what: discovery, ownership or cross-sell?' },
  { icon: 'brief', category: 'Executive', title: 'Executive decision brief', desc: 'One page: today, the gap, the fixes, owners', mode: 'agent',
    q: 'Write a one-page executive brief for this month: where we stand against target, where sales are lost, and the top three actions with owners.' },
];

/** The categorized question library, by what a leader is trying to do. */
export const LIBRARY: Array<{ category: string; items: Array<{ q: string; tag: string; mode: 'chat' | 'agent' }> }> = [
  { category: 'Executive', items: [
    { q: 'What can you help me with?', tag: 'capabilities', mode: 'chat' },
    { q: 'How did we do yesterday, and are we on pace for target this month?', tag: 'today', mode: 'chat' },
    { q: 'What is the daily new sales conversion this month, and how does it compare with the 5.4% target?', tag: 'daily', mode: 'chat' },
    { q: 'Write a one-page executive brief for this month: where we stand against target, where sales are lost, and the top three actions with owners.', tag: 'brief', mode: 'agent' },
  ] },
  { category: 'Sales', items: [
    { q: 'Show weekly conversion for Postpaid Voice and Home new connections over the last 8 weeks.', tag: 'weekly', mode: 'chat' },
    { q: 'Which product categories sold most last month, and what monthly revenue did they bring?', tag: 'mix', mode: 'chat' },
    { q: 'Which call reasons convert best and worst last month?', tag: 'call reasons', mode: 'chat' },
    { q: 'Break down lost sales by driver (Customer, People, System) and reason.', tag: 'lost sales', mode: 'chat' },
  ] },
  { category: 'Systems and process', items: [
    { q: 'How many sales were lost to Jarvis errors this month, and what is the conversion impact in points?', tag: 'Jarvis', mode: 'chat' },
    { q: 'What is the average Jarvis ticket resolution time by error type?', tag: 'tickets', mode: 'chat' },
    { q: 'Which states have the highest failed credit check rate on new connections?', tag: 'credit check', mode: 'chat' },
    { q: 'What are the top transfer destinations and what share of transfers were avoidable?', tag: 'transfers', mode: 'chat' },
  ] },
  { category: 'People', items: [
    { q: 'Which consultants have the lowest cross-sell attempt rate on home internet sales?', tag: 'cross-sell', mode: 'chat' },
    { q: "Which team leads' teams have the lowest discovery scores in Elevate audits?", tag: 'discovery', mode: 'chat' },
    { q: 'Do nesting consultants (under 3 months) convert less than tenured ones?', tag: 'tenure', mode: 'chat' },
  ] },
  { category: 'First contact resolution', items: [
    { q: 'What is FCR achieved, repeat and transfer % by week ending?', tag: 'FCR', mode: 'chat' },
    { q: 'How many repeat contacts closed a sale, and what is their conversion?', tag: 'repeats', mode: 'chat' },
    { q: 'What is the average handle time for sale calls vs non-sale calls, by product?', tag: 'handle time', mode: 'chat' },
  ] },
];
