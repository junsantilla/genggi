"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { uploadPhotoAction, removePhotoAction } from "@/app/actions";
import UserAvatar from "./UserAvatar";
import { optimizeCloudinaryUrl } from "@/lib/cloudinary-url";

const MAX_SIZE = 3 * 1024 * 1024;

export default function PhotoUpload({
  hasPhoto,
  photoUrl,
}: {
  hasPhoto: boolean;
  photoUrl?: string | null;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const shown = preview ?? photoUrl ?? "/images/avatar.png";

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setError("");
    setSuccess(false);
    if (!f) {
      setFileName("");
      setPreview(null);
      return;
    }
    if (f.size > MAX_SIZE) {
      setFileName("");
      setPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setError("Image must be under 3MB.");
      return;
    }
    if (!f.type.startsWith("image/")) {
      setFileName("");
      setPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setError("Please upload an image file.");
      return;
    }
    setFileName(f.name);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
  };

  const pickFile = () => fileInputRef.current?.click();

  return (
    <div>
      <form
        ref={formRef}
        action={async (fd: FormData) => {
          setPending(true);
          setError("");
          setSuccess(false);
          const res = await uploadPhotoAction(fd);
          setPending(false);
          if (res && "error" in res && res.error) setError(res.error);
          else {
            setPreview(null);
            setFileName("");
            setSuccess(true);
            if (formRef.current) formRef.current.reset();
          }
        }}
      >
        <div className="flex flex-col sm:flex-row items-start gap-3">
          <button
            type="button"
            onClick={pickFile}
            className="shrink-0 p-0 border-0 bg-transparent cursor-pointer"
            title={preview || photoUrl ? "Click to change photo" : "Click to add a photo"}
          >
            {shown ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview ?? optimizeCloudinaryUrl(shown, { width: 280, height: 280 }) ?? shown}
                alt={preview ? "New photo preview" : photoUrl ? "Current profile photo" : "Default avatar"}
                className="w-[140px] h-[140px] object-cover hover:opacity-80"
              />
            ) : (
              <div className="relative w-[140px] h-[140px] overflow-hidden">
                <UserAvatar
                  src={null}
                  alt="No profile photo"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="relative z-10 flex h-full flex-col items-center justify-center gap-1.5 bg-white/45 text-[11px] font-bold text-[#2c4d80]">
                  <span>No photo yet</span>
                  <span className="btn">Add a Photo</span>
                </div>
              </div>
            )}
          </button>
          <div className="flex flex-col items-start gap-1.5 min-w-0">
            <button type="button" className="btn" onClick={pickFile}>
              {fileName ? fileName : "Choose File"}
            </button>
            <span className="text-[11px] text-gray-500">JPG, PNG or GIF · up to 3MB</span>
            <button type="submit" className="btn" disabled={pending || !fileName}>
              {pending ? "Uploading..." : hasPhoto ? "Replace Photo" : "Upload Photo"}
            </button>
            {hasPhoto && (
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => {
                  if (window.confirm("Remove your profile photo?")) removePhotoAction();
                }}
              >
                Remove Photo
              </button>
            )}
          </div>
        </div>
        <input
          ref={fileInputRef}
          id="profile-photo"
          type="file"
          name="photo"
          accept="image/*"
          className="sr-only"
          onChange={handleFile}
        />
        {error && <div className="text-red-600 text-[11px] mt-2">{error}</div>}
        {success && (
          <div className="text-green-700 text-[11px] font-bold mt-2" role="status">
            Photo updated!
          </div>
        )}
      </form>
    </div>
  );
}
