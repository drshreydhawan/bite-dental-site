#!/bin/bash
# Bite Dental — Push site updates to GitHub
# Run this from your Terminal: bash push-to-github.sh

REPO="https://github.com/drshreydhawan/bite-dental-site.git"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DEPLOY_DIR="$SCRIPT_DIR/netlify_deploy"

echo "🦷 Bite Dental — Pushing updates to GitHub..."

# Check if we're already in a git repo
if [ -d "$SCRIPT_DIR/.git" ]; then
  echo "✓ Git repo found. Adding and committing changes..."
  cd "$SCRIPT_DIR"
  git add netlify_deploy/index.html netlify_deploy/blog/index.html netlify_deploy/blog/post.html netlify_deploy/content/ netlify_deploy/admin/
  git commit -m "feat: Smile Stories, WhatsApp CTAs upgrade, blog listing page"
  git push
  echo "✅ Pushed! Netlify will auto-deploy in ~30 seconds."
else
  echo "📁 No git repo found here. Cloning your GitHub repo..."
  cd /tmp
  git clone "$REPO" bite-site
  
  echo "📋 Copying updated files..."
  cp -r "$DEPLOY_DIR/." /tmp/bite-site/netlify_deploy/
  
  cd /tmp/bite-site
  git add .
  git commit -m "feat: Smile Stories, WhatsApp CTAs upgrade, blog listing page"
  git push
  echo "✅ Pushed! Netlify will auto-deploy in ~30 seconds."
  
  # Clean up
  cd /tmp && rm -rf bite-site
fi
