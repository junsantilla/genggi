# Contributing to Genggi

Thanks for contributing to Genggi. Keep changes focused, consistent with the existing App Router structure, and easy to verify locally.

## Before You Start

- Read the project setup instructions in [README.md](README.md).
- Use a current Node.js 20.9 or newer release.
- Copy the required values into a local `.env.local` file. Never commit credentials or production data.
- Check the current branch and working tree before editing so unrelated work is preserved.

## Development Workflow

1. Create a focused branch for your change.
2. Run `npm install` if dependencies are not installed.
3. Start the app with `npm run dev`.
4. Make the smallest change that addresses the issue or feature.
5. Add or update tests for behavior that can be exercised without external services.
6. Run the checks listed below before opening a pull request.

## Checks

Run these commands from the repository root:

```bash
npm run lint
npm test
npm run build
```

The test suite uses Vitest with a JSDOM environment and Testing Library. Tests that need MongoDB, Firebase, R2, Cloudinary, Resend, or another external service should use a focused mock or test seam rather than real production credentials.

## Code Guidelines

- Use TypeScript and follow the existing formatting and naming conventions.
- Reuse existing helpers in `lib/` and existing UI components before adding new abstractions.
- Keep server-only credentials and database access on the server. Do not expose secrets through `NEXT_PUBLIC_*` variables.
- Validate user input at the server boundary as well as in the UI when both are relevant.
- Preserve the existing responsive behavior and accessibility patterns.
- Keep user-facing copy clear and consistent with the Genggi tone.
- Update documentation when setup, scripts, configuration, or user-visible behavior changes.

## Pull Requests

A pull request should include:

- A concise description of the problem and the approach taken.
- The relevant tests and manual verification performed.
- Screenshots or a short recording for visual or interaction changes when useful.
- Notes about environment variables, database changes, migrations, or deployment steps.

Keep pull requests focused. Separate unrelated cleanup or formatting changes into another pull request. Reviewers should be able to run the documented checks without needing access to production services.

## Reporting Issues

Use the structured GitHub Issue Forms when opening issues:

- **Bug Reports**: Select the affected area, provide step-by-step reproduction instructions, expected vs. actual behavior, and relevant environment details (browser/OS or Node.js version). Always remove personal information, passwords, tokens, and `.env.local` secrets from logs or screenshots before submitting.
- **Feature Requests**: Focus on the problem or nostalgic experience you want to improve ("the why") alongside your proposed solution and whether you are willing to contribute the implementation.
- **Security Vulnerabilities**: For sensitive security issues, report them privately via GitHub Security Advisories rather than opening a public issue.
