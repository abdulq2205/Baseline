#!/usr/bin/env bash
# Re-download the NIST CSF 2.0 reference data.
#
# You should not normally need this: data/csf-2.0.json is committed, and
# committing it is the point — the catalog must be reproducible without network
# access, and the file is the record of what was actually seeded.
#
# Source: NIST Cybersecurity and Privacy Reference Tool (CPRT), CSF 2.0.
# NIST.CSWP.29, 26 February 2024. US Government work, public domain.
set -euo pipefail

URL="https://csrc.nist.gov/extensions/nudp/services/json/nudp/framework/version/CSF_2_0_0/element/all/graph"
OUT="$(dirname "$0")/../data/csf-2.0.json"

echo "Fetching $URL"
curl -fsSL --max-time 120 -o "$OUT" "$URL"
echo "Wrote $OUT ($(wc -c < "$OUT" | tr -d ' ') bytes)"
shasum -a 256 "$OUT"
