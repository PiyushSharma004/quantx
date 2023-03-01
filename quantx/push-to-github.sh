#!/bin/bash
# ──────────────────────────────────────────────────────────────────
# QuantX — Push to GitHub in one command
# Usage: bash push-to-github.sh YOUR_GITHUB_USERNAME YOUR_REPO_NAME
# Example: bash push-to-github.sh john123 quantx
# ──────────────────────────────────────────────────────────────────

set -e

USERNAME=$1
REPO=$2

if [ -z "$USERNAME" ] || [ -z "$REPO" ]; then
  echo "Usage: bash push-to-github.sh YOUR_USERNAME YOUR_REPO_NAME"
  echo "Example: bash push-to-github.sh john123 quantx"
  exit 1
fi

echo ""
echo "🚀 Pushing QuantX to GitHub..."
echo "   User: $USERNAME"
echo "   Repo: $REPO"
echo ""

# Init git if not already
if [ ! -d ".git" ]; then
  git init
  echo "✅ Git initialized"
fi

# Set up gitignore entries to make sure node_modules never gets pushed
echo "" >> .gitignore
echo "# Auto-added by push script" >> .gitignore
echo "node_modules/" >> .gitignore
echo ".env" >> .gitignore
echo "dist/" >> .gitignore
echo "build/" >> .gitignore

git add .
git commit -m "feat: QuantX AI Trading Platform — India Markets, AI Prediction, Paper Trading, Order Book, Live Charts, Market News" 2>/dev/null || echo "Nothing new to commit"

git branch -M main

# Set remote (replace if exists)
git remote remove origin 2>/dev/null || true
git remote add origin "https://github.com/$USERNAME/$REPO.git"

echo ""
echo "📤 Pushing to https://github.com/$USERNAME/$REPO ..."
echo "   (GitHub will ask for your username + Personal Access Token as password)"
echo ""

git push -u origin main

echo ""
echo "✅ Done! Visit: https://github.com/$USERNAME/$REPO"
