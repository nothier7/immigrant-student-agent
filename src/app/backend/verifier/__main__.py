# verifier/__main__.py — entrypoint. Run with `python -m verifier` from
# src/app/backend; a scheduler triggers it daily (e.g. AWS EventBridge,
# cron, or GitHub Actions) in deployment.

import asyncio
import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env")

from bank import repository
from verifier.batch import run_batch


async def main():
    await repository.init_pool(os.environ["DATABASE_URL"])
    try:
        await run_batch()
    finally:
        await repository.close_pool()


if __name__ == "__main__":
    asyncio.run(main())
