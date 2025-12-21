#!/usr/bin/env python3

from datetime import datetime, timezone


def main() -> None:
    print("简单测试脚本运行中…")
    now = datetime.now(timezone.utc)
    print(f"当前 UTC 时间: {now.isoformat()}")
    print(f"2 + 3 = {2 + 3}")


if __name__ == "__main__":
    main()
