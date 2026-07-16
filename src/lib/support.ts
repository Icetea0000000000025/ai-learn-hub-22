import { supabase, getAdminDb } from "./supabase";
import { issueStripeRefund } from "./stripe";
import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "./server-auth";

export async function createSupportThread(userId: string, subject: string, initialMessage: string) {
  const { data: thread, error: threadError } = await supabase
    .from("support_threads")
    .insert({ user_id: userId, subject })
    .select()
    .single();

  if (threadError) throw threadError;

  const { error: messageError } = await supabase.from("support_messages").insert({
    thread_id: thread.id,
    sender_id: userId,
    message: initialMessage,
  });

  if (messageError) throw messageError;
  return thread;
}

export async function fetchAllSupportThreads() {
  const { data, error } = await supabase
    .from("support_threads")
    .select("*, profiles:user_id(name, email), support_messages(message, created_at, sender_id)")
    .order("updated_at", { ascending: false });

  if (error) throw error;

  // Process data to only include the truly latest NON-EMPTY message info
  const processed = (data || []).map((thread) => {
    const messages = (thread.support_messages || []).filter(
      (m: any) => m.message && m.message.trim() !== "",
    );
    const sortedMsgs = [...messages].sort((a, b) => {
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      return timeB - timeA;
    });
    return {
      ...thread,
      lastMessage: sortedMsgs[0] || null,
    };
  });

  // Final sort:
  // 1. Status (open/resolved first, closed last)
  // 2. Latest message time
  return processed.sort((a, b) => {
    const statusOrder: Record<string, number> = { open: 0, resolved: 1, closed: 2 };
    const orderA = statusOrder[a.status || "open"] ?? 0;
    const orderB = statusOrder[b.status || "open"] ?? 0;

    if (orderA !== orderB) return orderA - orderB;

    const timeA = a.lastMessage?.created_at
      ? new Date(a.lastMessage.created_at).getTime()
      : a.updated_at
        ? new Date(a.updated_at).getTime()
        : 0;
    const timeB = b.lastMessage?.created_at
      ? new Date(b.lastMessage.created_at).getTime()
      : b.updated_at
        ? new Date(b.updated_at).getTime()
        : 0;

    return timeB - timeA;
  });
}

export async function fetchSupportThreadMessages(threadId: string) {
  const { data, error } = await supabase
    .from("support_messages")
    .select("*, profiles:sender_id(name, role)")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data;
}

export async function sendSupportMessage(threadId: string, senderId: string, message: string) {
  if (!message || message.trim() === "") {
    throw new Error("Message content cannot be empty.");
  }

  const { data, error } = await supabase
    .from("support_messages")
    .insert({
      thread_id: threadId,
      sender_id: senderId,
      message: message.trim(),
    })
    .select()
    .single();

  if (error) throw error;

  // Update thread updated_at
  await supabase
    .from("support_threads")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", threadId);

  return data;
}

export async function updateSupportThreadStatus(
  threadId: string,
  status: "open" | "resolved" | "closed",
) {
  const { data, error } = await supabase
    .from("support_threads")
    .update({ status })
    .eq("id", threadId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function fetchUserUsageHistory(userId: string) {
  // Combine enrollment activity and AI logs
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("*, courses(title)")
    .eq("user_id", userId);

  const { data: aiLogs } = await supabase
    .from("ai_logs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return { enrollments, aiLogs };
}

/**
 * SERVER FUNCTION: Process a full refund via Stripe and database.
 */
export const processRefund = createServerFn({ method: "POST" }).handler(async (ctx: any) => {
  await requireAdmin();
  const payload = ctx?.data ?? ctx;
  const paymentId = typeof payload === "string" ? payload : payload?.paymentId;
  const adminDb = getAdminDb();

  const { data: payment, error: fetchError } = await adminDb
    .from("payments")
    .select("*")
    .eq("id", paymentId)
    .single();

  if (fetchError || !payment) throw new Error("Payment not found.");

  const txId = payment.transaction_id;
  if (txId && (txId.startsWith("cs_") || txId.startsWith("pi_") || txId.startsWith("ch_"))) {
    try {
      await (issueStripeRefund as any)({ data: { transactionId: txId } });
    } catch (e: any) {
      console.warn("Stripe refund failed:", e.message);
    }
  }

  const { data: updatedPayment, error: updateError } = await adminDb
    .from("payments")
    .update({ status: "refunded" })
    .eq("id", paymentId)
    .select()
    .single();

  if (updateError) throw updateError;

  if (payment.user_id && payment.course_id) {
    await adminDb
      .from("enrollments")
      .delete()
      .eq("user_id", payment.user_id)
      .eq("course_id", payment.course_id);
  }

  return updatedPayment;
});

/**
 * SERVER FUNCTION: Permanently delete a transaction record.
 */
export const deletePaymentRecord = createServerFn({ method: "POST" }).handler(async (ctx: any) => {
  await requireAdmin();
  const payload = ctx?.data ?? ctx;
  const paymentId = typeof payload === "string" ? payload : payload?.paymentId;
  const adminDb = getAdminDb();
  const { error } = await adminDb.from("payments").delete().eq("id", paymentId);

  if (error) {
    console.error("[DELETE ERROR]", error);
    throw new Error("Failed to delete payment record.");
  }
  return true;
});

/**
 * SERVER FUNCTION: Permanently delete multiple transaction records at once.
 */
export const deletePaymentRecords = createServerFn({ method: "POST" }).handler(async (ctx: any) => {
  await requireAdmin();
  const payload = ctx?.data ?? ctx;
  const paymentIds = Array.isArray(payload) ? payload : payload?.paymentIds; // Array of IDs
  if (!Array.isArray(paymentIds) || paymentIds.length === 0) return true;

  const adminDb = getAdminDb();
  const { error } = await adminDb.from("payments").delete().in("id", paymentIds);

  if (error) {
    console.error("[BULK DELETE ERROR]", error);
    throw new Error("Failed to delete payment records.");
  }
  return true;
});


export async function fetchUserThreads(userId: string) {
  const { data, error } = await supabase
    .from("support_threads")
    .select("*, support_messages(message, created_at)")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw error;

  // Process data to only include the truly latest NON-EMPTY message info
  const processed = (data || []).map((thread) => {
    const messages = (thread.support_messages || []).filter(
      (m: any) => m.message && m.message.trim() !== "",
    );
    const sortedMsgs = [...messages].sort((a, b) => {
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      return timeB - timeA;
    });
    return {
      ...thread,
      lastMessage: sortedMsgs[0] || null,
    };
  });

  // Final sort:
  // 1. Status (open/resolved first, closed last)
  // 2. Latest activity time (last message or thread update)
  return processed.sort((a, b) => {
    const statusOrder: Record<string, number> = { open: 0, resolved: 1, closed: 2 };
    const orderA = statusOrder[a.status || "open"] ?? 0;
    const orderB = statusOrder[b.status || "open"] ?? 0;

    if (orderA !== orderB) return orderA - orderB;

    const timeA = a.lastMessage?.created_at
      ? new Date(a.lastMessage.created_at).getTime()
      : a.updated_at
        ? new Date(a.updated_at).getTime()
        : 0;
    const timeB = b.lastMessage?.created_at
      ? new Date(b.lastMessage.created_at).getTime()
      : b.updated_at
        ? new Date(b.updated_at).getTime()
        : 0;

    return timeB - timeA;
  });
}
