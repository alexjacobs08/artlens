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
    cache_key: str = ""  # filename stem for the on-disk image cache

    def __post_init__(self):
        if not self.cache_key:
            self.cache_key = self.id.replace(":", "_")


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
                    cache_key=image_id,  # keeps pre-multisource caches valid
                )
                yielded += 1
            page += 1


class ClevelandSource:
    """Cleveland Museum of Art Open Access API (CC0 filterable, no key).

    https://openaccess-api.clevelandart.org/ — ~41k CC0 works with images.
    `images.web` (~750px JPEG) is used for both embedding and thumbnails.
    """

    name = "cma"
    BASE = "https://openaccess-api.clevelandart.org/api/artworks/"

    def __init__(self, client: httpx.Client | None = None):
        self.client = client or httpx.Client(
            headers={"User-Agent": USER_AGENT}, timeout=30.0
        )

    def iter_records(self, limit: int) -> Iterator[ArtworkRecord]:
        skip, yielded = 0, 0
        while yielded < limit:
            resp = _get_with_retry(
                self.client, self.BASE,
                params={"cc0": "1", "has_image": "1", "limit": 100, "skip": skip},
            )
            data = resp.json().get("data", [])
            if not data:
                return
            for row in data:
                if yielded >= limit:
                    return
                web = (row.get("images") or {}).get("web") or {}
                if not web.get("url"):
                    continue
                creators = row.get("creators") or []
                artist = (creators[0].get("description") or "Unknown artist"
                          if creators else "Unknown artist")
                yield ArtworkRecord(
                    id=f"cma:{row['id']}",
                    title=row.get("title") or "Untitled",
                    artist=artist,
                    date=row.get("creation_date") or "",
                    image_id=str(row["id"]),
                    source="Cleveland Museum of Art",
                    image_url=web["url"],
                    thumbnail_url=web["url"],
                    page_url=row.get("url") or f"https://clevelandart.org/art/{row['id']}",
                )
                yielded += 1
            skip += 100


class MetSource:
    """Metropolitan Museum of Art Collection API (no key).

    No public-domain filter on the search endpoint, so we walk curated
    departments (paintings-heavy first), fetch each object, and keep
    isPublicDomain works with a primaryImageSmall. Per-object requests are
    throttled by the shared concurrency cap; the Met asks clients to stay
    well under 80 req/s.
    """

    name = "met"
    SEARCH = "https://collectionapi.metmuseum.org/public/collection/v1/search"
    OBJECT = "https://collectionapi.metmuseum.org/public/collection/v1/objects/{id}"
    # Department ids, most painting/print-rich first.
    DEPARTMENTS = [11, 1, 15, 6, 21, 14, 9, 19, 13, 10, 17, 12]

    def __init__(self, client: httpx.Client | None = None):
        self.client = client or httpx.Client(
            headers={"User-Agent": USER_AGENT}, timeout=30.0
        )

    def iter_records(self, limit: int) -> Iterator[ArtworkRecord]:
        yielded = 0
        seen: set[int] = set()
        for dept in self.DEPARTMENTS:
            if yielded >= limit:
                return
            resp = _get_with_retry(
                self.client, self.SEARCH,
                params={"hasImages": "true", "departmentId": dept, "q": "*"},
            )
            ids = resp.json().get("objectIDs") or []
            log.info("Met dept %s: %d candidate objects", dept, len(ids))
            for oid in ids:
                if yielded >= limit:
                    return
                if oid in seen:
                    continue
                seen.add(oid)
                try:
                    obj = _get_with_retry(self.client, self.OBJECT.format(id=oid)).json()
                except Exception as e:
                    log.warning("Met object %s failed: %s", oid, e)
                    continue
                img = obj.get("primaryImageSmall")
                if not obj.get("isPublicDomain") or not img:
                    continue
                yield ArtworkRecord(
                    id=f"met:{oid}",
                    title=obj.get("title") or "Untitled",
                    artist=obj.get("artistDisplayName") or "Unknown artist",
                    date=obj.get("objectDate") or "",
                    image_id=str(oid),
                    source="The Metropolitan Museum of Art",
                    image_url=img,
                    thumbnail_url=img,
                    page_url=obj.get("objectURL")
                    or f"https://www.metmuseum.org/art/collection/search/{oid}",
                )
                yielded += 1


SOURCES: dict[str, type] = {"aic": ArticSource, "cma": ClevelandSource, "met": MetSource}
