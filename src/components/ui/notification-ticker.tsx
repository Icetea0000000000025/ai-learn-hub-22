import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { Zap } from "lucide-react";

export function NotificationTicker() {
  const { data: notifications = [] } = useQuery({
    queryKey: ["active-ticker-notifications"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("system_notifications")
        .select("*")
        .eq("is_active", true)
        .in("type", ["info", "promotion"])
        .order("created_at", { ascending: false });
      if (error) return [];
      return data || [];
    },
  });

  if (notifications.length === 0) return null;

  const latestMessage = notifications[0].message;

  return (
    <div className="h-9 bg-indigo-950 text-white overflow-hidden border-b border-indigo-800/30 flex items-center relative z-[60]">
      {/* Static Flash Label */}

      <div className="flex-1 overflow-hidden relative h-full flex items-center bg-gradient-to-r from-indigo-950 via-indigo-900/50 to-indigo-950">
        <motion.div
          animate={{ x: ["100%", "-100%"] }}
          transition={{
            repeat: Infinity,
            duration: 30,
            ease: "linear",
          }}
          className="whitespace-nowrap w-full"
        >
          <div className="inline-flex items-center gap-8 px-4">
            <span className="text-indigo-400 font-black tracking-widest opacity-30">
              &gt;&gt;&gt;
            </span>
            <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-white">
              {latestMessage}
            </span>
            <span className="text-indigo-400 font-black tracking-widest opacity-30">
              &lt;&lt;&lt;
            </span>
          </div>
        </motion.div>

        {/* Visual Edge Fades */}
        <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-indigo-950 to-transparent z-10" />
        <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-indigo-950 to-transparent z-10" />
      </div>
    </div>
  );
}
