# Tewatashi

Share agent-built webpages from your own GitHub repository with expiring links. Each project is a directory of static files. A single link grants access to its pages, scripts, images, and downloads.

## Give this prompt to your agent

> Use https://github.com/ScienJus/tewatashi as a template to publish this webpage and its assets to my own private repository and Vercel project, then give me a working share link that expires in 7 days.

## Try the public demo

Open [tewatashi.scienjus.com](https://tewatashi.scienjus.com/) and sign in with the public demo admin token:

```text
tewatashi-demo-pass
```

Choose `example`, select an expiration, and generate a link. Open it in a private browser window to view the sample color palette as a guest.

Anyone with this token can view every project on the demo instance and issue fresh share links. Keep the demo limited to the bundled example. To deploy it on Vercel, assign `tewatashi.scienjus.com` to the demo project, set its production `ADMIN_TOKEN` to the value above, and generate a separate, secret `SHARE_SIGNING_KEY` for that deployment.

## Public repository policy

**The upstream repository, `ScienJus/tewatashi`, is for the framework and its bundled demo. Never commit or push personal webpages, reports, data, attachments, or other user artifacts anywhere in this repository, including under `public/example/`. Every commit and push to upstream requires the repository owner's explicit approval for those changes.** See [AGENTS.md](AGENTS.md) for the instructions for agents.

## Deploy your own instance

1. On GitHub, choose **Use this template → Create a new repository → Private** to keep your files private. A public fork also works for content you intend to publish as source. Anyone can read the files in a public fork directly on GitHub.
2. Import your own repository into Vercel using the Next.js preset. Set two independent production secrets. Use `ADMIN_TOKEN` to sign in and `SHARE_SIGNING_KEY` to sign guest links. Generate each value separately with `openssl rand -hex 32`. Keep both values private on personal instances.
3. Deploy and enable Vercel Authentication with **Standard Protection** to restrict access to historical deployment URLs. Open the production domain to sign in and issue links.

## Publish and revoke links

Place your site's files in `public/<project>/` in your own repository. Use a project name that starts with a lowercase letter or digit and contains only lowercase letters, digits, and hyphens. The name `api` is reserved. Reference assets with relative paths such as `./images/map.png`. The build rejects symlinks in the static directory. Push to your own repository to deploy the project at `/<project>/`.

Sign in on the homepage, pick a project and a lifetime, and copy the share link. Visitors who open it receive a cookie scoped to that project and are redirected to a clean URL. The server checks the signature, expiration, and revocation status on each file request. To revoke one link, add its displayed ID as a string in the root `revoked.json` array and redeploy. The new deployment also rejects cookies issued from that link.

The admin page and hosted projects share a browser origin. Publish only HTML, JavaScript, and third-party scripts you trust to act with the current visitor's permissions. Anyone who receives a share link can forward it. Treat `share` values in URLs and request logs as credentials.

## Run locally

Use Node.js 22.12 or later. Run `npm ci`, copy `.env.example` to `.env.local`, and fill in two independently generated local secrets. Run `npm run dev` and open <http://127.0.0.1:3000/>.

Run `npm test` for credential checks. With the local server listening on port 3000, run `node --env-file=.env.local scripts/check-local.mjs` to test sign-in, sharing, and access to the example and its assets.
