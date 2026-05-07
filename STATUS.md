# Bite Dental — Website Build Status
_Last updated: 2026-04-13_

---

## 🌐 Deployment
- **Repo**: `/Users/shreydhawan/Desktop/Bite_rebrand/netlify_deploy/`
- **Live site**: https://www.bitedentalclinic.com
- **Staging site**: https://drshreydhawan.wixsite.com/website-16 (Wix, separate)
- **Deploy command**: `cd /Users/shreydhawan/Desktop/Bite_rebrand && git push`
  - Netlify auto-deploys in ~30s after push

---

## ✅ Pages Complete

| Page | Path | Status |
|------|------|--------|
| Homepage | `/` | ✅ Done |
| Crowns & Bridges | `/crowns/` | ✅ Done |
| Braces & Aligners | `/braces-aligners/` | ✅ Done |
| Dental Implants | `/dental-implants/` | ✅ Done |
| Book Appointment | `/book-appointment/` | ✅ Done |
| Admin Panel | `/admin/` | ✅ Done |
| Blog index | `/blog/` | ✅ Done (reads from JSON) |
| Location — Delhi | `/delhi/` | ✅ Done |
| Location — Gurugram | `/gurugram/` | ✅ Done |

---

## 🔑 Admin Panel
- **URL**: `bitedentalclinic.com/admin`
- **Password**: `bite2025`
- **Appointments tab**: reads localStorage, search/filter/status/CSV export/WhatsApp per-row
- **Blog tab**: markdown editor + live preview; "Add to Blog JSON" downloads updated `blog-posts.json`
  - To publish a blog post: write → download JSON → replace `netlify_deploy/content/blog-posts.json` → `git push`

---

## 📋 Blog System
- Posts stored in: `netlify_deploy/content/blog-posts.json`
- Schema: `{ posts: [{ slug, title, tag, date, excerpt, image, content }] }`
- 5 posts already published
- To add a post: use `/admin` blog tab → download JSON → replace file → `git push`

---

## 📱 Appointment Flow
- Patient submits form → WhatsApp auto-opens to clinic with full details
- Delhi clinic WA: `917533951611`
- Gurugram clinic WA: `919810664561`
- Backup: Netlify Forms (check Netlify dashboard) + localStorage admin table

---

## 🎨 Brand Variables
```
Primary green:    #60BC01
Dark bg:          #07100A / #0C180F
Card bg:          #111A13
Border:           #1E2E1F
Font headings:    Barlow Condensed
Font body:        Inter
```

---

## 🖼️ Image Folders
```
netlify_deploy/Resources/
  crowns/           — crown/bridge cases (hero: anterior-zirconia-bridge.jpg)
  implants/         — implant cases (6 images added)
  orthodontics/     — braces/aligner cases (7 images added)
  smile-stories/    — general smile transformation cases
  Profiles/         — doctor headshots (11.png=Dr.Shrey, Aman_bite_profile.png=Dr.Aman)
```

---

## 👨‍⚕️ Doctors
- **Dr. Shrey Dhawan** — MDS Endodontist, Clinic Owner
  - Photo: `Resources/Profiles/11.png`
  - WA: +919810664561
- **Dr. Aman Sharma** — MDS Orthodontist, Lead Ortho Specialist
  - Photo: `Resources/Profiles/Aman_bite_profile.png`
- **Dr. Shipra** — Gurugram (photo TBD — placeholder emoji in Gurugram page)

---

## 🚧 Pending / To-Do

- [ ] **Add Dr. Shipra photo** — save headshot as `Resources/Profiles/shipra.png` and update `/gurugram/index.html` doctor card (currently shows 👩‍⚕️ emoji)
- [ ] **Verify homepage nav** has `/braces-aligners` link (all treatment pages updated, homepage may need check)
- [ ] **Kids Dentistry page** — not yet built (`/kids-dentistry/`) — listed in nav but may 404
- [ ] **Root Canal page** — not yet built (`/root-canal/`) — listed in nav but may 404
- [ ] **Smile Design page** — not yet built (`/smile-design/`) — listed in nav but may 404
- [ ] **Whitening page** — not yet built (`/whitening/`) — listed in nav but may 404
- [ ] **Optional**: Set up Decap CMS `config.yml` for true in-browser publishing without git push step

---

## 🗂️ Key Files (VM workspace path)
```
netlify_deploy/
  index.html                        — Homepage
  crowns/index.html                 — Crowns & Bridges
  braces-aligners/index.html        — Braces & Aligners (NEW)
  dental-implants/index.html        — Dental Implants
  book-appointment/index.html       — Booking form
  admin/index.html                  — Admin panel (rebuilt)
  blog/index.html                   — Blog listing
  content/blog-posts.json           — Blog post data
  delhi/index.html                  — Delhi location page
  gurugram/index.html               — Gurugram location page
  Resources/                        — All images
```

---

## 📌 Git Status (as of 2026-04-13)
- Last commit: `e25c6b5` — "Fix appointment auto-WhatsApp + rebuild admin panel"
- Branch: `main`
- **Action needed**: `git push` from Mac Terminal if not yet done
