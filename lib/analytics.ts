import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient | null {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  _client = createClient(url, key, { auth: { persistSession: false } });
  return _client;
}

export type Agent = "qa" | "loan" | "tax" | "finder" | "lecture";

export function getSessionId(): string {
  if (typeof window === "undefined") return "";
  const key = "bp_sid";
  let sid = sessionStorage.getItem(key);
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem(key, sid);
  }
  return sid;
}

export async function logChat(params: {
  agent: Agent;
  messageType?: "text" | "report";
  userMsg: string;
  aiMsg?: string;
  danjiName?: string;
  msgIndex: number;
  responseTimeMs?: number;
  sessionId?: string;
  userId?: string;
}): Promise<string | null> {
  const client = getClient();
  if (!client) return null;
  const sid = params.sessionId ?? getSessionId();
  const { data, error } = await client
    .from("chat_logs")
    .insert({
      session_id: sid,
      user_id: params.userId ?? null,
      agent: params.agent,
      message_type: params.messageType ?? "text",
      question: params.userMsg,
      answer: params.aiMsg ?? null,
      danji_name: params.danjiName ?? null,
      msg_index: params.msgIndex,
      response_time_ms: params.responseTimeMs ?? null,
    })
    .select("id")
    .single();
  if (error) {
    console.error("logChat error:", error);
    return null;
  }
  return String(data?.id ?? "");
}

export async function logFeedback(
  chatId: string,
  feedback: "good" | "bad",
  text?: string
): Promise<void> {
  const client = getClient();
  if (!client) return;
  const { error } = await client
    .from("chat_logs")
    .update({
      feedback,
      feedback_text: text ?? null,
      feedback_at: new Date().toISOString(),
    })
    .eq("id", chatId);
  if (error) console.error("logFeedback error:", error);
}

export async function logEvent(
  eventType: string,
  agent?: Agent,
  extra: Record<string, unknown> = {},
  sessionId?: string
): Promise<void> {
  const client = getClient();
  if (!client) return;
  const sid = sessionId ?? getSessionId();
  const { error } = await client.from("conversion_events").insert({
    session_id: sid,
    event_type: eventType,
    agent: agent ?? null,
    extra,
  });
  if (error) console.error("logEvent error:", error);
}

export async function submitWaitlist(params: {
  name?: string;
  contact: string;
  planType: string;
  useCases?: string[];
  notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  const client = getClient();
  if (!client) return { success: false, error: "Supabase not configured" };
  const sid = getSessionId();
  const { error } = await client.from("waitlist").insert({
    session_id: sid,
    name: params.name ?? null,
    contact: params.contact,
    plan_type: params.planType,
    use_cases: params.useCases ?? null,
    notes: params.notes ?? null,
  });
  if (error) {
    console.error("submitWaitlist error:", error);
    return { success: false, error: error.message };
  }
  await logEvent("pro_waitlist_submit", undefined, { plan_type: params.planType });
  return { success: true };
}
