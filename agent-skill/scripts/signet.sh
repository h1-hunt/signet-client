#!/usr/bin/env bash
# Signet CLI helper for AI agents
# Usage:
#   signet.sh estimate [hours]   — Get estimated USDC cost
#   signet.sh list [count]       — List recent signatures

set -euo pipefail
SIGNET_API="${SIGNET_API:-https://signet.sebayaki.com}"

case "${1:-help}" in
  estimate)
    hours="${2:-0}"
    curl -s "$SIGNET_API/api/x402/estimate?guaranteeHours=$hours" | python3 -m json.tool 2>/dev/null || curl -s "$SIGNET_API/api/x402/estimate?guaranteeHours=$hours"
    ;;
  list)
    count="${2:-5}"
    curl -s "$SIGNET_API/api/signature/list?startIndex=0&endIndex=$count" | python3 -m json.tool 2>/dev/null || curl -s "$SIGNET_API/api/signature/list?startIndex=0&endIndex=$count"
    ;;
  *)
    echo "Usage: signet.sh <estimate|list> [args]"
    echo ""
    echo "Commands:"
    echo "  estimate [hours]  Get estimated USDC cost for spotlight (0-24h)"
    echo "  list [count]      List recent signatures"
    exit 1
    ;;
esac
