#!/usr/bin/env bash
# Updates plugins/ballerina/skills/ballerina/troubleshooting.md
# from wso2-enterprise/wso2-integration-internal
#
# Requires: gh CLI authenticated with read access to that repo
# Usage: ./scripts/sync-troubleshooting.sh
set -euo pipefail

REPO="wso2-enterprise/wso2-integration-internal"
FILE_PATH="docs/ballerina-troubleshooting-guide.md"
LOCAL="plugins/ballerina/skills/ballerina/troubleshooting.md"

echo "Checking upstream SHA..."
UPSTREAM_SHA=$(gh api repos/$REPO/contents/$FILE_PATH --jq '.sha')
CURRENT_SHA=$(grep '<!-- SHA:' "$LOCAL" | sed 's/.*SHA: \(.*\) -->/\1/' | tr -d ' ')

if [ "$UPSTREAM_SHA" = "$CURRENT_SHA" ]; then
  echo "Already up to date (SHA: $UPSTREAM_SHA)"
  exit 0
fi

echo "Updating ($CURRENT_SHA → $UPSTREAM_SHA)..."
TODAY=$(date +%Y-%m-%d)
{
  echo "<!-- SOURCE: $REPO:$FILE_PATH -->"
  echo "<!-- SHA: $UPSTREAM_SHA -->"
  echo "<!-- Last synced: $TODAY -->"
  echo ""
  gh api repos/$REPO/contents/$FILE_PATH --jq '.content' | base64 -d
} > "$LOCAL"

echo "Done. Updated to SHA: $UPSTREAM_SHA"
echo "Commit with: git add $LOCAL && git commit -m 'Sync Ballerina troubleshooting guide ($UPSTREAM_SHA)'"
