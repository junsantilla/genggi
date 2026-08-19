"use client";

import { useEffect, useRef } from "react";
import { incrementProfileViewAction } from "@/app/actions";

export default function ProfileViewTracker({ username }: { username: string }) {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    incrementProfileViewAction(username);
  }, [username]);
  return null;
}
