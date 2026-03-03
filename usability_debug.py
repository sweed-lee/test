#!/usr/bin/env python3
"""Simple script for usability debugging."""

from __future__ import annotations

import json
import os
import platform
import sys
from datetime import datetime, timezone


def main() -> None:
    name = sys.argv[1] if len(sys.argv) > 1 else "debug-user"
    payload = {
        "ok": True,
        "message": f"Hello, {name}",
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "cwd": os.getcwd(),
        "python": sys.version.split()[0],
        "platform": platform.platform(),
        "argv": sys.argv[1:],
    }
    print(json.dumps(payload, indent=2))


if __name__ == "__main__":
    main()
