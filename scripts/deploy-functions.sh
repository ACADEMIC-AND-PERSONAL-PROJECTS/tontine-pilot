#!/usr/bin/env bash
# Push current handler sources straight to Lambda (esbuild + update-function-code).
# WHY: `ampx sandbox` watch rebuilds create/update infra + schema reliably but
# does NOT refresh deployed function CODE (stale bundles observed 2026-09-25/26:
# deploys "complete" while Lambda LastModified + bundle bytes stay frozen).
# Use this after every handler/_shared change until the sandbox quirk is fixed.
# Usage: ./scripts/deploy-functions.sh [fn-name ...]   (default: all)
set -euo pipefail
cd "$(dirname "$0")/.."
REGION="${AWS_REGION:-us-east-1}"
BANNER_FILE="${BANNER_FILE:-/tmp/banner.js}"
if [ ! -f "$BANNER_FILE" ]; then
  echo "BANNER_FILE missing ($BANNER_FILE). Extract it once from a sandbox esbuild failure log:"
  echo "  grep -o '\-\-banner:js=.* --inject' /tmp/ampx-*.log | head -1"
  exit 1
fi
BANNER=$(cat "$BANNER_FILE")
SHIM="./amplify/node_modules/@aws-amplify/backend-function/lib/lambda-shims/cjs_shim.js"
FNS="${*:-parse-declaration parse-receipt mediate recommend-rotation digest-audio reminders-worker assistant}"
for fn in $FNS; do
  OUT="/tmp/tp-fn-$fn"
  rm -rf "$OUT"; mkdir -p "$OUT"
  npx esbuild --bundle "amplify/functions/$fn/handler.ts" \
    --platform=node --format=esm --target=node22 --minify \
    --outfile="$OUT/index.mjs" \
    --banner:js="$BANNER" --inject:"$SHIM" --log-level=error
  (cd "$OUT" && zip -q -o "/tmp/tp-fn-$fn.zip" index.mjs)
  LNAME=$(aws lambda list-functions --region "$REGION" \
    --query "Functions[?contains(FunctionName, \`$(echo "$fn" | tr -d '-')\`)].FunctionName" \
    --output text | tr ' ' '\n' | head -n 1)
  if [ -z "$LNAME" ]; then echo "SKIP $fn (not deployed yet — use sandbox first)"; continue; fi
  LM=$(aws lambda update-function-code --function-name "$LNAME" \
    --zip-file "fileb:///tmp/tp-fn-$fn.zip" --region "$REGION" \
    --query 'LastModified' --output text)
  echo "OK $fn -> $LNAME @ $LM"
done
