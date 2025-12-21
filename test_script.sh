#!/usr/bin/env bash

# Simple smoke test script to prove the setup works.
set -euo pipefail

echo "Quick functionality test at $(date)"
echo "Current directory: $(pwd)"
echo "Directory contents:"
ls -1
