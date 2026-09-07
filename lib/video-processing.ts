// ---------------------------------------------------------------------------
// Video processing interface.
//
// Uploaded Vids go through a status lifecycle (uploading -> processing ->
// published). This module is the seam where server-side transcoding plugs in.
// Today the deployment has no FFmpeg worker, so processVideo is a passthrough
// that keeps the original file — the uploaded bytes are already stored at the
// final key (vids/{userId}/{vidId}/video.mp4), so no duplicate copies exist.
//
// To add real optimization later (target: 9:16, max 1080x1920, H.264 + AAC in
// an MP4 container, ~10-30 MB), implement processVideo with a queue/worker
// (e.g. ffmpeg.wasm in a worker, or a dedicated transcoder service). Keep the
// record status "processing" until the optimized file is written, then flip it
// to "published" and delete the oversized source. processVideo already returns
// the key to serve, so callers do not need to change.
// ---------------------------------------------------------------------------

export interface ProcessVideoInput {
  userId: string;
  vidId: string;
  videoKey: string;
  // Original upload's content type, e.g. "video/mp4".
  contentType: string;
}

export interface ProcessVideoResult {
  // Storage key of the file to serve as the published video.
  videoKey: string;
}

export async function processVideo(input: ProcessVideoInput): Promise<ProcessVideoResult> {
  // Passthrough: no transcoder is configured on this deployment, so the
  // original (already at the final key) is served as-is.
  return { videoKey: input.videoKey };
}