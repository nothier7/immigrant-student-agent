# discovery/__main__.py — entrypoint mirroring the verifier's.
# Run with `python -m discovery` from src/app/backend; scheduled daily.

import asyncio
import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env")

from bank import repository
from discovery.batch import run_discovery


async def main():
    await repository.init_pool(os.environ["DATABASE_URL"])
    try:
        await run_discovery()
    finally:
        await repository.close_pool()


if __name__ == "__main__":
    asyncio.run(main())
