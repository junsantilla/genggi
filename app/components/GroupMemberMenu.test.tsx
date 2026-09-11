import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GroupMemberMenu from "./GroupMemberMenu";

const { removeGroupMemberAction } = vi.hoisted(() => ({
    removeGroupMemberAction: vi.fn(),
}));

vi.mock("@/app/actions", () => ({ removeGroupMemberAction }));

describe("GroupMemberMenu", () => {
    it("removes the member from the dropdown", async () => {
        const user = userEvent.setup();
        vi.spyOn(window, "confirm").mockReturnValue(true);
        removeGroupMemberAction.mockResolvedValue({ ok: true });

        render(
            <GroupMemberMenu
                groupId="group-1"
                memberId="user-1"
                memberName="Ann"
            />,
        );

        expect(
            screen.queryByRole("button", { name: "Remove" }),
        ).not.toBeInTheDocument();

        await user.click(
            screen.getByRole("button", { name: "Actions for Ann" }),
        );
        await user.click(screen.getByRole("button", { name: "Remove" }));

        expect(removeGroupMemberAction.mock.calls[0]).toEqual([
            "group-1",
            "user-1",
        ]);
        // Success closes the menu.
        expect(
            screen.queryByRole("button", { name: "Remove" }),
        ).not.toBeInTheDocument();
    });

    it("closes the menu when clicking outside", async () => {
        const user = userEvent.setup();

        render(
            <div>
                <GroupMemberMenu
                    groupId="group-1"
                    memberId="user-1"
                    memberName="Ann"
                />
                <button type="button">Outside</button>
            </div>,
        );

        await user.click(
            screen.getByRole("button", { name: "Actions for Ann" }),
        );
        expect(
            screen.getByRole("button", { name: "Remove" }),
        ).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Outside" }));
        expect(
            screen.queryByRole("button", { name: "Remove" }),
        ).not.toBeInTheDocument();
    });
});
