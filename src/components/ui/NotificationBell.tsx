"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { Notification } from "@/types/database";

function timeAgo(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    const response = await fetch("/api/notifications");
    if (response.ok) {
      const data = await response.json();
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleOpen() {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (nextOpen && unreadCount > 0) {
      setUnreadCount(0);
      setNotifications((current) => current.map((notification) => ({ ...notification, read_at: notification.read_at ?? new Date().toISOString() })));
      await fetch("/api/notifications/read", { method: "POST" });
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleOpen}
        aria-label="Notifications"
        className="relative text-text-muted transition-colors hover:text-text"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-text">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 z-50 mt-3 w-80 max-w-[90vw] rounded-xl border border-border bg-surface shadow-2xl"
          >
            <div className="border-b border-border px-4 py-3">
              <p className="font-metal text-sm text-text">NOTIFICATIONS</p>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-text-muted">Nothing yet. Go make some noise.</p>
              ) : (
                notifications.map((notification) => (
                  <div key={notification.id} className="border-b border-border px-4 py-3 last:border-b-0">
                    <p className="text-sm font-semibold text-text">{notification.title}</p>
                    <p className="mt-0.5 text-xs text-text-muted">{notification.body}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-wide text-text-muted">
                      {timeAgo(notification.created_at)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
