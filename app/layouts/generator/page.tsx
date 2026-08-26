import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import Profile from "@/app/components/Profile";
import ProfileGenerator from "@/app/components/ProfileGenerator";

export const metadata: Metadata = {
  title: "Profile Layout Generator",
  description: "Design and apply a custom layout for your genggi profile.",
};

export default async function ProfileLayoutGeneratorPage() {
  const user = await requireUser();
  const existingCss = !!user.theme?.customCss?.trim();

  return (
    <ProfileGenerator existingCss={existingCss}>
      <Profile user={user} currentUser={user} customCssEnabled={false} />
    </ProfileGenerator>
  );
}
