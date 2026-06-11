# lambda_handler.py — AWS Lambda entrypoints for the scheduled jobs.
#
# Both functions are built from the same container image (Dockerfile.lambda);
# Terraform points each Lambda at a different handler via image_config.command:
#   verifier  -> lambda_handler.verifier_handler   (EventBridge: rate(1 day))
#   discovery -> lambda_handler.discovery_handler  (EventBridge: rate(7 days))
#
# Lambda invokes a sync handler, so each one spins up its own event loop with
# asyncio.run — same lifecycle as the local `python -m verifier` entrypoint.

from __future__ import annotations

import asyncio
import os


def _run_job(job) -> None:
    async def main():
        from bank import repository

        await repository.init_pool(os.environ["DATABASE_URL"])
        try:
            await job()
        finally:
            # The pool must close every invocation: Lambda may freeze the
            # execution environment between runs and kill idle TCP connections.
            await repository.close_pool()

    asyncio.run(main())


def verifier_handler(event, context):
    from verifier.batch import run_batch

    _run_job(run_batch)
    return {"ok": True, "job": "verifier"}


def discovery_handler(event, context):
    from discovery.batch import run_discovery

    _run_job(run_discovery)
    return {"ok": True, "job": "discovery"}
