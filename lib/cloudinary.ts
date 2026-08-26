import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  // Keep the cloud name server-only when possible, while supporting the
  // existing NEXT_PUBLIC name and Cloudinary's CLOUDINARY_URL fallback.
  cloud_name:
    process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function getConfiguredCloudinary() {
  const config = cloudinary.config();
  if (!config.cloud_name || !config.api_key || !config.api_secret) {
    throw new Error(
      "Cloudinary is not configured. Set CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET."
    );
  }
  return config;
}

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
}

export function uploadImage(
  buffer: Buffer,
  folder: string
): Promise<CloudinaryUploadResult> {
  getConfiguredCloudinary();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"],
        transformation: {
          width: 1600,
          height: 1600,
          crop: "limit",
          quality: "auto:eco",
          fetch_format: "auto",
          flags: "strip_profile",
        },
      },
      (error, result) => {
        if (error) reject(error);
        else if (!result) reject(new Error("Cloudinary upload returned no result."));
        else resolve({ secure_url: result.secure_url, public_id: result.public_id });
      }
    );
    stream.end(buffer);
  });
}

export function destroyImage(publicId: string): Promise<unknown> {
  getConfiguredCloudinary();
  return cloudinary.uploader.destroy(publicId, { resource_type: "image" });
}
