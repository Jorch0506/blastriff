import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, NotificationType } from "@/types/database";

export async function notifyUser(
  admin: SupabaseClient<Database>,
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  data: Record<string, unknown> = {}
): Promise<void> {
  await admin.from("notifications").insert({
    user_id: userId,
    type,
    title,
    body,
    data,
  });
}
