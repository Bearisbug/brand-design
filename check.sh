#!/bin/sh
# Mechanical checks only. See references/validation-contract.md.
set -eu
brand_skill_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec node "$brand_skill_dir/scripts/check-skill.mjs" "$@"
