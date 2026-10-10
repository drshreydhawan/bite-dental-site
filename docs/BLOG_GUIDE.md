# Bite Dental Blog: how your team adds posts

## Easiest way for your team: the upload page
**Link to share:** `https://www.bitedentalclinic.com/write`
**Password:** ask the site owner (it is stored only in Vercel as `BLOG_UPLOAD_PASSWORD`, never in the website code or this repository)

What your marketing team does: open the link, enter the password and their name, fill in the boxes, paste the article, press **Send for review**.
What happens next: the post arrives on GitHub as a **pull request** (you get an email). You open it, read it, and press **Merge** to publish, or **Close** to reject. **Nothing is published without your approval.** Your team needs **no GitHub account and no access to the repository**.

### One-time setup (owner, ~10 minutes)
1. **GitHub token** (lets the form create the pull request): GitHub → Settings → Developer settings → **Fine-grained personal access tokens** → *Generate new token*. Repository access: **Only select repositories → `bite-dental-site`**. Permissions: **Contents: Read and write** and **Pull requests: Read and write**. Copy the token.
2. **Vercel** → your project → Settings → **Environment Variables** (Production): add
   - `BLOG_UPLOAD_PASSWORD` = the password you choose (min 12 characters recommended)
   - `GITHUB_TOKEN` = the token from step 1
   Then **Redeploy**. (Never paste the token in chat or into a file in the repo.)
3. **Test:** open `/write`, submit a test post, then close the pull request on GitHub.
Change the password any time by editing `BLOG_UPLOAD_PASSWORD` in Vercel and redeploying. The password is short and shared, so keep it inside the team and change it when someone leaves. The form locks out repeated wrong guesses, and a wrong password can only fail, because posts never go live without your approval.

### Reviewing a submission (owner, 2 minutes)
GitHub → **Pull requests** → open "Blog submission: …" → tick the checklist (clinical accuracy, prices, no patient details, no superlatives) → check the **Vercel preview** link → **Merge**. The post is live about a minute later.

---

## Alternative: the full editor at /admin (for people with a GitHub account)
Rich editor with drafts and an approval board. Needs the OAuth setup in section A below, and every editor must be a GitHub collaborator, so **only use this after the repo is split** (the repository currently contains patient photos and practice data).


## The idea in one minute
Your marketing team writes posts in a **simple web form at `bitedentalclinic.com/admin`** (like Google Docs plus a few boxes).
Nothing goes live until **you approve it**. The site rebuilds itself and the post appears at `bitedentalclinic.com/blog/<name>` in about a minute.

```
Marketer writes post  →  moves it to "In review"  →  YOU click "Ready" + "Publish"  →  site rebuilds  →  live
```
Every post is a plain text file (`netlify_deploy/content/blog/<name>.md`), so nothing can break the main website and every change is saved and reversible.

---

## A. /admin editor setup (owner, about 15 minutes)

> **Do the repo clean-up first.** Giving someone access to the GitHub repository also gives them access to everything in it.
> Today that includes patient photos and practice data. Do **not** invite the team until the website and the private files are in separate repositories. (This is the "later" repo task. Tell Claude when you're ready.)

1. **Create a GitHub "OAuth App"** (this is what the Sign-in button uses)
   - GitHub → profile picture → **Settings** → **Developer settings** → **OAuth Apps** → **New OAuth App**
   - Application name: `Bite Dental Blog Editor`
   - Homepage URL: `https://www.bitedentalclinic.com`
   - Authorization callback URL: `https://www.bitedentalclinic.com/api/callback`
   - Click **Register application**, then **Generate a new client secret**. Keep that tab open.
2. **Put the two values into Vercel** (Vercel → your project → **Settings** → **Environment Variables**, tick Production):
   - `GITHUB_CLIENT_ID` = the Client ID
   - `GITHUB_CLIENT_SECRET` = the client secret
   Then **Redeploy** (Deployments → ⋯ → Redeploy). Never paste the secret into chat, email or a file in the repo.
3. **Check the build settings** (Vercel → Settings → General): Root Directory is `netlify_deploy` (or the site folder), Framework Preset **Other**. `vercel.json` already tells Vercel to run `node scripts/build-blog.cjs`.
4. **Invite each team member** (GitHub repo → **Settings** → **Collaborators** → **Add people**). They need a free GitHub account; give them **Write** access.
5. Test it yourself: go to `bitedentalclinic.com/admin` → **Login with GitHub** → **New Blog post**.

Remove someone's access any time by removing them as a collaborator. Nothing else needs changing.

## B. Writing a post (marketing team)

1. Go to `bitedentalclinic.com/admin` and sign in with GitHub.
2. **New Blog post** and fill in the boxes. The hints under each box tell you what to write.
3. Press **Save**, then set status to **In review** (top right).
4. The owner/reviewer checks it (a preview link appears in the GitHub pull request), sets **Ready** and **Publish**.

### What makes a post rank (the checklist)
- **One search question per post**, in the patient's words: "root canal cost in Delhi", "is Invisalign worth it", "kids first dental visit Gurugram". Put that phrase in the title.
- **800+ words**, with **Heading 2** for each section (the page builds a contents box from them). Never use Heading 1.
- **Answer first**, then explain. The first paragraph should answer the question in 2-3 sentences.
- **Name a clinician** as author *only if they have reviewed it*.
- **Prices:** use only the approved price list (see `marketing/SEO_REPORT.md` section 5). Say "starts from" and "confirmed after examination".
- **End with the booking buttons**. They are added automatically, and the "Related treatment" link is chosen from the Category.
- **Image:** landscape, under 300 KB (compress at squoosh.app), with a description. Only images we own or have written patient consent to publish.
- **Link to 2-3 of our treatment pages** inside the text using normal links, e.g. `[root canal treatment](/root-canal)`.

### Never write
"Best dentist", "100% painless", "guaranteed", "no side effects", "cure", "#1", fake or unverifiable reviews, patient names, or before/after photos without consent. The build prints a **REVIEW** warning if it spots these. Indian dental advertising rules restrict superlatives and comparative claims, so when in doubt ask the owner.

### Numbers we can use (owner approved on 10 Oct 2026)
15+ years experience · **3,000+ implants** · **1,400+ patient reviews across Google, Practo and Justdial** · Invisalign provider (confirm tier wording with Align) · laser-equipped.
Do **not** use: 5,000+ implants, 15,000+ patients, 98% success, "same-day appointments".

## C. Things that can go wrong (and the fix)
| Symptom | Cause | Fix |
|---|---|---|
| "Login with GitHub" does nothing / error page | Vercel variables missing, or callback URL typo | Re-check step 1-2, then Redeploy |
| Marketer can sign in but cannot save | Not added as collaborator with **Write** access | Add them (step 4) |
| Post published but not on the site | The build skipped it (draft ticked, TODO text, or bad date) | Open Vercel → latest deployment → Build Logs; look for `ERROR` lines |
| Post URL is ugly or too long | "Web address ending" was long | Edit it **before** publishing; changing it later breaks links |
| Want to unpublish | | Tick **Draft** on the post and publish the change |

## D. For developers
- Source: `netlify_deploy/content/blog/*.md` (YAML frontmatter + Markdown). Config: `content/blog-config.json` (authors, category → treatment link).
- Build: `node scripts/build-blog.cjs` → writes `blog/index.html`, `blog/<slug>/index.html`, `blog/feed.xml`, the homepage "latest posts" strip and the blog block in `sitemap.xml`. No `npm install` needed (`marked` and `js-yaml` are vendored).
- Editor: `admin/index.html` + `admin/config.yml` (Decap CMS, GitHub backend, editorial workflow). Sign-in: `api/auth.js` and `api/callback.js` (GitHub OAuth, with a CSRF `state` check).
- Add an author or category in **both** `content/blog-config.json` and `admin/config.yml`.
- If the site code moves to its own repo, edit the two folder paths at the top of `admin/config.yml`.
