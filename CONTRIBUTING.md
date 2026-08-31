# Contributing

Thanks for contributing to Genggi!

## Getting started

1. Fork the repository and clone your fork.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

## Branches

Create a new branch before making changes:

```bash
git checkout -b feature/short-description
```

Use a descriptive branch name, such as `feature/add-profile-page`, `fix/login-error`, or `docs/update-contributing-guide`.

## Making changes

- Keep changes focused and consistent with the existing code.
- Use clear, descriptive names and messages.
- Do not commit secrets or `.env.local` files.
- Update documentation when behavior or setup changes.

## Before submitting

Run the available checks locally:

```bash
npm run lint
npm test
npm run build
```

## Pull requests

- Explain what changed and why.
- Include screenshots for user-facing changes when helpful.
- Keep pull requests small and easy to review.
- Respond to review feedback and keep the branch up to date.
