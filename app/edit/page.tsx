import { requireUser } from "@/lib/auth";
import { updateProfileAction, updateThemeAction, updatePrivacyAction } from "@/app/actions";
import EditForm, { type EditableUser } from "@/app/components/EditForm";
import PhotoUpload from "@/app/components/PhotoUpload";
import Box from "@/app/components/Box";

export default async function EditPage() {
  const user = await requireUser();
  const editableUser: EditableUser = {
    displayName: user.displayName,
    firstName: user.firstName,
    lastName: user.lastName,
    gender: user.gender,
    location: user.location,
    relationshipStatus: user.relationshipStatus,
    orientation: user.orientation,
    zodiac: user.zodiac,
    bodyType: user.bodyType,
    occupation: user.occupation,
    mood: user.mood,
    awayMessage: user.awayMessage,
    favoriteSong: user.favoriteSong,
    interests: user.interests,
    aboutMe: user.aboutMe,
    whoIdLikeToMeet: user.whoIdLikeToMeet,
  };

  return (
    <div className="max-w-[760px] w-full mx-auto bg-white border border-[#6699cc] sm:border-x">
      <div className="bg-gradient-to-b from-[#4a76b8] to-[#2c4d80] text-white px-2.5 py-1.5 font-bold text-xl text-center tracking-tight">
        ✏️ Edit Profile
      </div>

      <div className="p-4 flex flex-col gap-4">
        <Box title="Profile Photo">
          <PhotoUpload hasPhoto={!!user.photo} />
        </Box>

        <Box title="Basic Info">
          <EditForm action={updateProfileAction} user={editableUser} />
        </Box>

        <Box title="🎨 Profile Theme">
          <form action={updateThemeAction} className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="label">Background tint</label>
              <input type="color" name="bgTint" defaultValue={user.theme.bgTint} className="input h-8 p-0.5" />
            </div>
            <div>
              <label className="label">Border color</label>
              <input type="color" name="border" defaultValue={user.theme.border} className="input h-8 p-0.5" />
            </div>
            <div className="col-span-2">
              <button type="submit" className="btn">
                Save Theme
              </button>
            </div>
          </form>
        </Box>

        <Box title="🔒 Privacy & Safety">
          <form action={updatePrivacyAction} className="flex flex-col gap-2 text-[11px]">
            <label className="flex items-center gap-2">
              <input type="checkbox" name="isPrivate" defaultChecked={user.isPrivate} />
              Private profile (only friends can view)
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="hideFromSearch" defaultChecked={user.hideFromSearch} />
              Hide from search results
            </label>
            <div className="flex flex-col gap-1">
              <span className="font-bold text-[#2c4d80]">Who can message me?</span>
              {["everyone", "friends", "nobody"].map((v) => (
                <label key={v} className="flex items-center gap-2">
                  <input type="radio" name="whoCanMessage" value={v} defaultChecked={user.whoCanMessage === v} />
                  {v === "everyone" ? "Everyone" : v === "friends" ? "Only friends" : "Nobody"}
                </label>
              ))}
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-bold text-[#2c4d80]">Who can send me friend requests?</span>
              {["everyone", "nobody"].map((v) => (
                <label key={v} className="flex items-center gap-2">
                  <input type="radio" name="whoCanFriendRequest" value={v} defaultChecked={user.whoCanFriendRequest === v} />
                  {v === "everyone" ? "Everyone" : "Nobody"}
                </label>
              ))}
            </div>
            <button type="submit" className="btn mt-1">
              Save Privacy
            </button>
          </form>
        </Box>
      </div>
    </div>
  );
}
