import { describe, expect, it } from "vitest";
import { optimizeCloudinaryUrl } from "./cloudinary-url";

describe("optimizeCloudinaryUrl", () => {
  const source =
    "https://res.cloudinary.com/demo/image/upload/v1234/profiles/avatar.jpg";

  it("adds automatic format, quality, and size transformations", () => {
    expect(optimizeCloudinaryUrl(source, { width: 120, height: 120 })).toBe(
      "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto:eco,w_120,h_120,c_fill,g_auto/v1234/profiles/avatar.jpg",
    );
  });

  it("leaves non-Cloudinary URLs unchanged", () => {
    const local = "/images/avatar.png";
    expect(optimizeCloudinaryUrl(local, { width: 120 })).toBe(local);
    expect(optimizeCloudinaryUrl(null, { width: 120 })).toBeUndefined();
  });

  it("does not add the delivery transformation twice", () => {
    const optimized = optimizeCloudinaryUrl(source, { width: 120 });
    expect(optimizeCloudinaryUrl(optimized, { width: 240 })).toBe(optimized);
  });
});
