#!/usr/bin/env python3
"""Tiny script for usability debugging."""

from __future__ import annotations

import argparse
import datetime as dt
import json
import platform
import sys
import time


def main() -> int:
    parser = argparse.ArgumentParser(description="Simple usability debug script.")
    parser.add_argument("--name", default="debug-user", help="Name shown in output.")
    parser.add_argument(
        "--sleep", type=float, default=0.0, help="Optional delay in seconds."
    )
    parser.add_argument("extra", nargs="*", help="Any extra words to echo.")
    args = parser.parse_args()

    if args.sleep > 0:
        time.sleep(args.sleep)

    payload = {
        "ok": True,
        "message": "usability debug script ran successfully",
        "name": args.name,
        "extra": args.extra,
        "python": sys.version.split()[0],
        "platform": platform.platform(),
        "timestamp_utc": dt.datetime.now(dt.timezone.utc).isoformat(),
    }
    print(json.dumps(payload, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
