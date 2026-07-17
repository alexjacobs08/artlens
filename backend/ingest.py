"""Artwork ingest sources.

Each source yields ArtworkRecord dicts behind the same interface so other
CC0/open corpora (Met Open Access, Rijksmuseum, WikiArt) can be added later:
implement a class with `iter_records(limit)` and register it in SOURCES.
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from typing import Iterator, Protocol

import httpx

log = logging.getLogger(__name__)

USER_AGENT = "artlens-index-builder/0.1 (https://github.com/alexjacobs08/artlens; alex.jacobs08@gmail.com)"


@dataclass
class ArtworkRecord:
    id: str            # source-prefixed unique id, e.g. "aic:12345"
    title: str
    artist: str
    date: str
    image_id: str
    source: str
    image_url: str     # full-size-ish image used for embedding
    thumbnail_url: str
    page_url: str


class Source(Protocol):
    name: str

    def iter_records(self, limit: int) -> Iterator[ArtworkRecord]: ...


def _get_with_retry(client: httpx.Client, url: str, params: dict | None = None,
                    max_tries: int = 6) -> httpx.Response:
    """GET with exponential backoff on 429/5xx and transient network errors."""
    delay = 1.0
    for attempt in range(max_tries):
        try:
            resp = client.get(url, params=params)
            if resp.status_code < 400:
                return resp
            if resp.status_code == 429 or resp.status_code >= 500:
                log.warning("HTTP %s from %s, retrying in %.1fs", resp.status_code, url, delay)
            else:
                resp.raise_for_status()
        except httpx.HTTPStatusError:
            raise
        except httpx.HTTPError as e:
            log.warning("Network error %s on %s, retrying in %.1fs", e, url, delay)
        time.sleep(delay)
        delay = min(delay * 2, 30)
    raise RuntimeError(f"Giving up on {url} after {max_tries} tries")


class ArticSource:
    """Art Institute of Chicago public API (CC0 for public-domain works, no key).

    Uses the plain /artworks listing (the /artworks/search endpoint caps at
    page*limit <= 10000) and filters is_public_domain client-side.
    """

    name = "aic"
    BASE = "https://api.artic.edu/api/v1/artworks"
    FIELDS = "id,title,artist_display,date_display,image_id,is_public_domain"
    INDEX_WIDTH = 843
    THUMB_WIDTH = 200

    def __init__(self, client: httpx.Client | None = None):
        self.client = client or httpx.Client(
            headers={"User-Agent": USER_AGENT}, timeout=30.0
        )
        self.iiif_url = "https://www.artic.edu/iiif/2"

    def iter_records(self, limit: int) -> Iterator[ArtworkRecord]:
        page = 1
        seen_images: set[str] = set()
        yielded = 0
        while yielded < limit:
            resp = _get_with_retry(
                self.client, self.BASE,
                params={"fields": self.FIELDS, "limit": 100, "page": page},
            )
            body = resp.json()
            # Trust the live config for the IIIF base if present.
            self.iiif_url = body.get("config", {}).get("iiif_url", self.iiif_url)
            data = body.get("data", [])
            if not data:
                log.info("Listing exhausted at page %d", page)
                return
            for row in data:
                if yielded >= limit:
                    return
                image_id = row.get("image_id")
                if not row.get("is_public_domain") or not image_id:
                    continue
                if image_id in seen_images:  # AIC has duplicate records per image
                    continue
                seen_images.add(image_id)
                yield ArtworkRecord(
                    id=f"aic:{row['id']}",
                    title=row.get("title") or "Untitled",
                    artist=row.get("artist_display") or "Unknown artist",
                    date=row.get("date_display") or "",
                    image_id=image_id,
                    source="Art Institute of Chicago",
                    image_url=f"{self.iiif_url}/{image_id}/full/{self.INDEX_WIDTH},/0/default.jpg",
                    thumbnail_url=f"{self.iiif_url}/{image_id}/full/{self.THUMB_WIDTH},/0/default.jpg",
                    page_url=f"https://www.artic.edu/artworks/{row['id']}",
                )
                yielded += 1
            page += 1


SOURCES: dict[str, type] = {"aic": ArticSource}
