// Behavioral-signal based nudge logic.
// Design decision: the system never reads message *content* to judge fit —
// only metadata (count, span, response timing, reciprocity). See design doc
// "Signals & nudging logic".

const { supabaseAdmin } = require('../config/supabase');

const MIN_MESSAGE_COUNT = 10; // a "real" exchange, not a single reply
const MIN_SPAN_HOURS = 12; // conversation has happened across more than a moment
const RECIPROCITY_MIN_RATIO = 0.4; // neither person is carrying the whole thing

async function evaluateConversationForNudge(conversationId) {
  const { data: messages, error } = await supabaseAdmin
    .from('messages')
    .select('sender_id, length_chars, sent_at')
    .eq('conversation_id', conversationId)
    .order('sent_at', { ascending: true });

  if (error || !messages || messages.length < MIN_MESSAGE_COUNT) {
    return { shouldNudge: false };
  }

  const first = new Date(messages[0].sent_at);
  const last = new Date(messages[messages.length - 1].sent_at);
  const spanHours = (last - first) / (1000 * 60 * 60);
  if (spanHours < MIN_SPAN_HOURS) {
    return { shouldNudge: false };
  }

  const bySender = {};
  for (const m of messages) {
    bySender[m.sender_id] = bySender[m.sender_id] || { count: 0, chars: 0 };
    bySender[m.sender_id].count += 1;
    bySender[m.sender_id].chars += m.length_chars;
  }
  const senders = Object.values(bySender);
  if (senders.length < 2) {
    return { shouldNudge: false };
  }
  const [a, b] = senders;
  const reciprocity = Math.min(a.chars, b.chars) / Math.max(a.chars, b.chars);
  if (reciprocity < RECIPROCITY_MIN_RATIO) {
    return { shouldNudge: false };
  }

  // Already nudged and not dismissed recently? Don't re-nudge every check.
  const { data: existingNudges } = await supabaseAdmin
    .from('nudges')
    .select('id, dismissed_at')
    .eq('conversation_id', conversationId)
    .order('sent_at', { ascending: false })
    .limit(1);

  if (existingNudges && existingNudges.length > 0 && !existingNudges[0].dismissed_at) {
    return { shouldNudge: false }; // a nudge is already out there, undismissed
  }

  return { shouldNudge: true };
}

async function sendNudgeIfWarranted(conversationId) {
  const { shouldNudge } = await evaluateConversationForNudge(conversationId);
  if (!shouldNudge) return null;

  const { data, error } = await supabaseAdmin
    .from('nudges')
    .insert({ conversation_id: conversationId, kind: 'plan_meetup' })
    .select()
    .single();

  if (error) return null;

  await supabaseAdmin
    .from('conversations')
    .update({ status: 'nudged' })
    .eq('id', conversationId);

  return data;
}

module.exports = { evaluateConversationForNudge, sendNudgeIfWarranted };
