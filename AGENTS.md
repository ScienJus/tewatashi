# Maintaining the public template

These rules apply to every branch of the public upstream repository, `github.com/ScienJus/tewatashi`.

- Keep upstream limited to framework code, documentation, tests, and the bundled `public/example/` demo. Never add user artifacts, including webpages, reports, data, or attachments, anywhere in upstream. Keep private Git history, credentials, live share links, and private deployment settings out of the repository. The README intentionally publishes the public demo admin token. Its signing key stays secret.
- When asked to publish or share an artifact, check the destination repository and its actual push URL first. If the target is this upstream, stop and ask for the user's own instance repository and Vercel project. Users can fork for public content or create an independent private repository with **Use this template** for private content.
- Before committing or pushing upstream changes, review the complete staged diff and all outgoing commits. Show the owner the files, changes, destination repository, and branch. Wait for the owner's explicit approval covering the specific commit or push. Obtain fresh approval if the content or destination changes. Apply the same rule to writes through GitHub's web UI or API.
