"use client";

import { useState, useRef } from "react";
import { uploadPhotoAction, removePhotoAction } from "@/app/actions";

export default function PhotoUpload({ hasPhoto }: { hasPhoto: boolean }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div>
      <form
        ref={formRef}
        action={async (fd: FormData) => {
          setPending(true);
          setError("");
          const res = await uploadPhotoAction(fd);
          setPending(false);
          if (res && "error" in res && res.error) setError(res.error);
          else {
            setPreview(null);
            if (formRef.current) formRef.current.reset();
          }
        }}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="preview" className="w-[120px] h-[120px] object-cover border border-[#6699cc] mb-1" />
        ) : (
          <input type="file" name="photo" accept="image/*" className="text-[11px]" onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) {
              const reader = new FileReader();
              reader.onload = () => setPreview(reader.result as string);
              reader.readAsDataURL(f);
            }
          }} />
        )}
        {error && <div className="text-red-600 text-[10px]">{error}</div>}
        <div className="mt-1 flex gap-1.5">
          <button type="submit" className="btn" disabled={pending}>
            {pending ? "..." : hasPhoto ? "Replace Photo" : "Upload Photo"}
          </button>
        </div>
      </form>
      {hasPhoto && (
        <button
          type="button"
          className="btn btn-danger mt-1"
          onClick={() => {
            if (window.confirm("Remove your profile photo?")) removePhotoAction();
          }}
        >
          Remove Photo
        </button>
      )}
    </div>
  );
}
