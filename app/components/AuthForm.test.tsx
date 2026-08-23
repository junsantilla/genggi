import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AuthForm from "./AuthForm";

// Same field set the /signup page passes in.
const signupFields = [
  { name: "username", label: "Username (3-20 chars, lowercase)", type: "text" },
  { name: "displayName", label: "Display Name", type: "text" },
  { name: "email", label: "Email", type: "email" },
  { name: "password", label: "Password (min 6 chars)", type: "password" },
  { name: "confirm", label: "Confirm Password", type: "password" },
];

describe("signup form (AuthForm)", () => {
  it("renders every field plus the submit button", () => {
    render(
      <AuthForm
        action={vi.fn()}
        fields={signupFields}
        submitLabel="Create Account"
        mathChallenge
      />
    );

    expect(screen.getByLabelText("Username (3-20 chars, lowercase)")).toBeInTheDocument();
    expect(screen.getByLabelText("Display Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Password (min 6 chars)")).toHaveAttribute("type", "password");
    expect(screen.getByLabelText("Confirm Password")).toHaveAttribute("type", "password");
    expect(screen.getByLabelText(/What is \d+ \+ \d+\?/)).toHaveAttribute("type", "number");
    expect(screen.getByRole("button", { name: "Create Account" })).toBeInTheDocument();
  });

  it("submits the typed values to the action", async () => {
    const action = vi.fn().mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    render(
      <AuthForm
        action={action}
        fields={signupFields}
        submitLabel="Create Account"
        mathChallenge
      />
    );

    await user.type(screen.getByLabelText("Username (3-20 chars, lowercase)"), "junsantilla");
    await user.type(screen.getByLabelText("Display Name"), "Jun Santilla");
    await user.type(screen.getByLabelText("Email"), "jun@example.com");
    await user.type(screen.getByLabelText("Password (min 6 chars)"), "secret123");
    await user.type(screen.getByLabelText("Confirm Password"), "secret123");
    const mathLabel = screen.getByLabelText(/What is \d+ \+ \d+\?/);
    const question = mathLabel.previousElementSibling?.textContent ?? "";
    const [, first, second] = question.match(/(\d+) \+ (\d+)/) ?? [];
    await user.type(mathLabel, String(Number(first) + Number(second)));
    await user.click(screen.getByRole("button", { name: "Create Account" }));

    expect(action).toHaveBeenCalledTimes(1);
    const [, formData] = action.mock.calls[0] as [unknown, FormData];
    expect(formData.get("username")).toBe("junsantilla");
    expect(formData.get("displayName")).toBe("Jun Santilla");
    expect(formData.get("email")).toBe("jun@example.com");
    expect(formData.get("password")).toBe("secret123");
    expect(formData.get("confirm")).toBe("secret123");
    expect(formData.get("mathFirst")).toBe(first);
    expect(formData.get("mathSecond")).toBe(second);
    expect(formData.get("mathAnswer")).toBe(String(Number(first) + Number(second)));
  });

  it("displays the error returned by the action", async () => {
    const action = vi.fn().mockResolvedValue({ error: "Username already taken." });
    const user = userEvent.setup();
    render(<AuthForm action={action} fields={signupFields} submitLabel="Create Account" />);

    await user.type(screen.getByLabelText("Username (3-20 chars, lowercase)"), "taken");
    await user.type(screen.getByLabelText("Display Name"), "Taken User");
    await user.type(screen.getByLabelText("Email"), "taken@example.com");
    await user.type(screen.getByLabelText("Password (min 6 chars)"), "secret123");
    await user.type(screen.getByLabelText("Confirm Password"), "secret123");
    await user.click(screen.getByRole("button", { name: "Create Account" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Username already taken.");
  });
});
