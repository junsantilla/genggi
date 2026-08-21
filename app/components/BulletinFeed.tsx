"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getMoreBulletinPostsAction } from "@/app/actions";
import type { SerializedBulletinPost } from "@/lib/types";
import Box from "./Box";
import BulletinPostCard from "./BulletinPostCard";
import BulletinPostForm from "./BulletinPostForm";

export default function BulletinFeed({
  initialPosts,
  hasMore,
  currentUserId,
  currentUsername,
}: {
  initialPosts: SerializedBulletinPost[];
  hasMore: boolean;
  currentUserId: string;
  currentUsername: string;
}) {
  const [posts, setPosts] = useState<SerializedBulletinPost[]>(initialPosts);
  const [more, setMore] = useState(hasMore);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const loadingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !more) return;
    loadingRef.current = true;
    setLoading(true);
    setError("");
    try {
      const last = posts[posts.length - 1];
      const res = await getMoreBulletinPostsAction(
        last ? { createdAt: last.createdAt, _id: last._id } : null
      );
      setPosts((prev) => [...prev, ...res.posts]);
      setMore(res.nextCursor !== null);
    } catch {
      setError("Could not load more posts.");
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [more, posts]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "300px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  const onPosted = useCallback(async () => {
    const res = await getMoreBulletinPostsAction(null);
    setPosts(res.posts);
    setMore(res.nextCursor !== null);
  }, []);

  return (
    <Box title="📌 Bulletin Board" className="bulletin-board">
      <BulletinPostForm onPosted={onPosted} />
      {posts.length === 0 ? (
        <p className="text-gray-500 italic text-[12px]">
          No bulletins yet. Be the first to post!
        </p>
      ) : (
        <div>
          {posts.map((post) => (
            <BulletinPostCard
              key={post._id}
              post={post}
              currentUserId={currentUserId}
              currentUsername={currentUsername}
              onPostDeleted={(postId) =>
                setPosts((prev) => prev.filter((p) => p._id !== postId))
              }
            />
          ))}
        </div>
      )}
      <div ref={sentinelRef} className="text-center text-[11px] text-gray-400 py-1">
        {loading && <span>Loading more...</span>}
        {error && <span className="text-red-600">{error}</span>}
        {!more && posts.length > 0 && <span>You&apos;re all caught up 🎉</span>}
      </div>
    </Box>
  );
}
