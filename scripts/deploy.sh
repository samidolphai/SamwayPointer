#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
#  SamwayPointer — One-command Netlify deploy
#  Usage: bash scripts/deploy.sh
# ─────────────────────────────────────────────────────────────
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

step() { echo -e "\n${CYAN}${BOLD}▶ $1${RESET}"; }
ok()   { echo -e "${GREEN}✔ $1${RESET}"; }
warn() { echo -e "${YELLOW}⚠ $1${RESET}"; }

echo -e "\n${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${BOLD}   SamwayPointer — Netlify Deploy Script${RESET}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"

# ── 1. Install Netlify CLI if missing ────────────────────────
step "Checking Netlify CLI"
if ! command -v netlify &>/dev/null; then
  echo "Installing Netlify CLI globally…"
  sudo npm install -g netlify-cli
  ok "Netlify CLI installed"
else
  ok "Netlify CLI already installed ($(netlify --version))"
fi

# ── 2. Login ─────────────────────────────────────────────────
step "Netlify login"
echo "A browser window will open — log in to Netlify, then return here."
netlify login
ok "Logged in"

# ── 3. Link or create Netlify site ───────────────────────────
step "Linking to Netlify site"
if [ ! -f ".netlify/state.json" ]; then
  echo "No site linked yet. Creating a new site named 'samwaypointer'…"
  netlify sites:create --name samwaypointer 2>/dev/null \
    || netlify sites:create            # auto-name if samwaypointer is taken
fi
netlify link 2>/dev/null || true
ok "Site linked"

# ── 4. Set environment variables ─────────────────────────────
step "Setting environment variables"

# Admin password — prompt if not set
HASH="$2b\$12\$PnFVjq6I34dNPqAtJLnHleKGEhx81udFxhmM8XsSiUi4FFlNy1UyG"
echo ""
warn "Current admin password hash is for password: 'admin'"
read -rp "Enter a new admin password (leave blank to keep 'admin'): " NEW_PASS
if [ -n "$NEW_PASS" ]; then
  HASH=$(node -e "const b=require('bcryptjs');b.hash('$NEW_PASS',12).then(h=>console.log(h))")
  ok "New password hash generated"
fi

JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

netlify env:set ADMIN_PASSWORD_HASH "$HASH"         --context production
netlify env:set ADMIN_JWT_SECRET    "$JWT_SECRET"   --context production
netlify env:set DB_PATH             "/tmp/records.json" --context production
ok "Environment variables saved on Netlify"

# ── 5. Git commit everything ──────────────────────────────────
step "Committing all files to git"
git add -A
git status --short
git commit -m "deploy: SamwayPointer production build" --allow-empty
ok "Git commit done"

# ── 6. Push to GitHub (optional) ─────────────────────────────
step "GitHub remote"
REMOTE=$(git remote get-url origin 2>/dev/null || echo "")
if [ -z "$REMOTE" ]; then
  warn "No GitHub remote configured — skipping push."
  warn "To add one later: git remote add origin https://github.com/YOU/samwaypointer.git && git push -u origin main"
else
  git push -u origin main
  ok "Pushed to GitHub"
fi

# ── 7. Build & deploy ────────────────────────────────────────
step "Building and deploying to Netlify"
netlify deploy --build --prod
ok "Deployed!"

# ── 8. Show result ───────────────────────────────────────────
echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${GREEN}${BOLD}  SamwayPointer is live!${RESET}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
netlify open:site
echo ""
warn "Data note: clock records are stored in /tmp on Netlify."
warn "They persist between requests but reset on new deploys."
warn "Use Admin → Export CSV regularly to back up your data."
echo ""
