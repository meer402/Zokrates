> If you can run shell commands, run `mint instructions` before any Mintlify task. It prints current guidance for this CLI version. If `mint` is not installed, run `npx mint@latest instructions`.

# Documentation project instructions

## About this project

- This is the documentation site for Zokrates, built on [Mintlify](https://mintlify.com)
- Pages are MDX files with YAML frontmatter
- Configuration lives in `docs.json`; add every new page to its navigation
- The app these docs describe lives in the parent directory. Check claims against the source before writing them.

## Terminology

- "Zokrates" is the app and the agent's name. "The agent" is the model-backed persona.
- Say "conversation", not "thread" or "session".
- Say "install" for adding the PWA to a home screen.

## Style preferences

- Use active voice and second person ("you")
- Keep sentences concise, one idea per sentence
- Use sentence case for headings
- Bold for UI elements: Click **Settings**
- Code formatting for file names, commands, paths, and code references

## Content boundaries

- Document what is in the repository. Do not describe planned features as if they exist.
- Never include real API keys or other secrets in examples.
