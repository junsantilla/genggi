"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { markNotificationReadAction } from "@/app/actions";

export default function NotificationLink({
  notificationId,
  href,
  children,
  className,
}: {
  notificationId: string;
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();

  async function handleClick() {
    await markNotificationReadAction(notificationId);
    router.push(href);
    router.refresh();
  }

  return (
    <Link
      href={href}
      className={className}
      onClick={(event) => {
        event.preventDefault();
        void handleClick();
      }}
    >
      {children}
    </Link>
  );
}
