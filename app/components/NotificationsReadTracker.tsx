"use client";

import { useEffect, useRef } from "react";
import { markNotificationsReadAction } from "@/app/actions";

export default function NotificationsReadTracker() {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    markNotificationsReadAction();
  }, []);
  return null;
}
