"use client";

import { useEffect, useRef, useState } from "react";
import { removeGroupMemberAction } from "@/app/actions";
import ActionButton from "./ActionButton";

// Mirrors the ⋯ menu on bulletin/group post cards: a dropdown whose only
// action is removing the member from the group.
export default function GroupMemberMenu({
    groupId,
    memberId,
    memberName,
}: {
    groupId: string;
    memberId: string;
    memberName: string;
}) {
    const [open, setOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;

        const handlePointerDown = (event: PointerEvent) => {
            if (!menuRef.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        };

        document.addEventListener("pointerdown", handlePointerDown);
        return () =>
            document.removeEventListener("pointerdown", handlePointerDown);
    }, [open]);

    return (
        <div ref={menuRef} className="relative shrink-0">
            <button
                type="button"
                className="border-0 bg-transparent text-[#003399] text-[16px] leading-none px-1 py-0 cursor-pointer hover:bg-[#dbe9f7]"
                onClick={() => setOpen((value) => !value)}
                aria-label={`Actions for ${memberName}`}
                aria-haspopup="menu"
                aria-expanded={open}
                title="Member actions"
            >
                ⋯
            </button>
            {open && (
                <div className="absolute right-0 top-full z-20 mt-1 min-w-[120px] border border-[#6699cc] bg-white p-1 shadow-lg">
                    <ActionButton
                        action={removeGroupMemberAction.bind(
                            null,
                            groupId,
                            memberId,
                        )}
                        className="block w-full cursor-pointer px-2 py-1 text-left text-[11px] text-[#cc0000] hover:bg-[#dbe9f7]"
                        confirmText={`Remove ${memberName} from this group?`}
                        onSuccess={() => setOpen(false)}
                    >
                        Remove
                    </ActionButton>
                </div>
            )}
        </div>
    );
}
