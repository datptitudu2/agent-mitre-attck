"""Entrypoint cho Vercel Python Serverless Function (/api/*)."""

from apps.api.app.main import app

__all__ = ["app"]
