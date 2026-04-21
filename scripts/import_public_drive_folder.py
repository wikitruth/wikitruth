#!/usr/bin/env python3
"""Import a public Google Drive folder recursively and convert docs to Markdown.

This script does three things:
1) Crawls a public Drive folder tree using embedded page metadata.
2) Downloads every reachable file into docs/ideas-docs/original/.
3) Converts supported document files into Markdown under
   docs/ideas-docs/markdown/.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
import urllib.parse
from collections import deque
from pathlib import Path
from typing import Any

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from markitdown import MarkItDown


FOLDER_MIME = "application/vnd.google-apps.folder"

GOOGLE_EXPORT_MAP: dict[str, tuple[str, str, dict[str, str]]] = {
    # mime: (extension, export_url_template, fixed_query_params)
    "application/vnd.google-apps.document": (
        "docx",
        "https://docs.google.com/document/d/{id}/export",
        {"format": "docx"},
    ),
    "application/vnd.google-apps.spreadsheet": (
        "xlsx",
        "https://docs.google.com/spreadsheets/d/{id}/export",
        {"format": "xlsx"},
    ),
    "application/vnd.google-apps.presentation": (
        "pptx",
        "https://docs.google.com/presentation/d/{id}/export",
        {"format": "pptx"},
    ),
}

CONVERTIBLE_EXTS = {
    ".txt",
    ".md",
    ".markdown",
    ".html",
    ".htm",
    ".csv",
    ".tsv",
    ".json",
    ".xml",
    ".yaml",
    ".yml",
    ".doc",
    ".docx",
    ".ppt",
    ".pptx",
    ".xls",
    ".xlsx",
    ".pdf",
    ".rtf",
    ".odt",
    ".ods",
    ".odp",
}

INVALID_FILENAME_CHARS = re.compile(r"[<>:\"/\\|?*\x00-\x1f]")
ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{10,}$")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--folder-url", required=True, help="Public Google Drive folder URL")
    parser.add_argument(
        "--output-dir",
        default="docs/ideas-docs",
        help="Destination directory inside repo",
    )
    return parser.parse_args()


def parse_folder_url(folder_url: str) -> tuple[str, str | None]:
    parsed = urllib.parse.urlparse(folder_url)
    parts = [p for p in parsed.path.split("/") if p]

    folder_id = None
    if "folders" in parts:
        idx = parts.index("folders")
        if idx + 1 < len(parts):
            folder_id = parts[idx + 1]

    if not folder_id or not ID_PATTERN.match(folder_id):
        raise ValueError(f"Could not parse folder id from URL: {folder_url}")

    query = urllib.parse.parse_qs(parsed.query)
    resource_key = query.get("resourcekey", [None])[0]
    return folder_id, resource_key


def build_session() -> requests.Session:
    session = requests.Session()
    retry = Retry(
        total=4,
        backoff_factor=0.6,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=("GET",),
    )
    adapter = HTTPAdapter(max_retries=retry)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    session.headers.update(
        {
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            )
        }
    )
    return session


def sanitize_name(name: str) -> str:
    name = INVALID_FILENAME_CHARS.sub("_", name)
    name = re.sub(r"\s+", " ", name).strip()
    if not name or name in {".", ".."}:
        name = "untitled"
    return name[:180]


def unique_name(candidate: str, used: set[str]) -> str:
    if candidate not in used:
        used.add(candidate)
        return candidate

    stem = candidate
    suffix = ""
    if "." in candidate and not candidate.startswith("."):
        stem, suffix = candidate.rsplit(".", 1)
        suffix = "." + suffix

    n = 2
    while True:
        alt = f"{stem} ({n}){suffix}"
        if alt not in used:
            used.add(alt)
            return alt
        n += 1


def extract_ivd_data(html: str) -> list[Any]:
    match = re.search(
        r"window\['_DRIVE_ivd'\]\s*=\s*'(.+?)';if \(window\['_DRIVE_ivdc'\]\)",
        html,
        flags=re.S,
    )
    if not match:
        raise RuntimeError("Could not find _DRIVE_ivd payload in folder page")

    # Payload is a JSON-like string encoded with \xNN escapes.
    raw_payload = match.group(1)
    decoded_payload = raw_payload.encode("utf-8").decode("unicode_escape")
    data = json.loads(decoded_payload)
    if not isinstance(data, list):
        raise RuntimeError("Unexpected _DRIVE_ivd payload shape")
    return data


def fetch_folder_entries(
    session: requests.Session,
    folder_id: str,
    resource_key: str | None,
) -> list[list[Any]]:
    params = {}
    if resource_key:
        params["resourcekey"] = resource_key

    resp = session.get(
        f"https://drive.google.com/drive/folders/{folder_id}",
        params=params,
        timeout=60,
    )
    if resp.status_code != 200:
        raise RuntimeError(
            f"Folder {folder_id} returned HTTP {resp.status_code}"
        )

    data = extract_ivd_data(resp.text)
    if not data:
        return []

    entries = data[0]
    if not isinstance(entries, list):
        return []

    normalized: list[list[Any]] = []
    for entry in entries:
        if isinstance(entry, list) and len(entry) >= 4:
            normalized.append(entry)
    return normalized


def item_resource_key(entry: list[Any]) -> str | None:
    if len(entry) > 139 and isinstance(entry[139], str) and entry[139].strip():
        return entry[139].strip()
    return None


def item_url(entry: list[Any]) -> str | None:
    if len(entry) > 114 and isinstance(entry[114], str) and entry[114].strip():
        return entry[114].strip()
    return None


def build_export_request(
    file_id: str,
    mime: str,
    resource_key: str | None,
) -> tuple[str, dict[str, str], str] | None:
    config = GOOGLE_EXPORT_MAP.get(mime)
    if not config:
        return None

    ext, url_template, base_params = config
    params = dict(base_params)
    if resource_key:
        params["resourcekey"] = resource_key
    return url_template.format(id=file_id), params, ext


def response_is_download(resp: requests.Response) -> bool:
    disp = resp.headers.get("Content-Disposition", "").lower()
    ctype = resp.headers.get("Content-Type", "").lower()
    if "attachment" in disp:
        return True
    if ctype and not ctype.startswith("text/html"):
        return True
    return False


def stream_to_file(resp: requests.Response, out_path: Path) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("wb") as fh:
        for chunk in resp.iter_content(chunk_size=1024 * 1024):
            if chunk:
                fh.write(chunk)


def download_binary_drive_file(
    session: requests.Session,
    file_id: str,
    resource_key: str | None,
    out_path: Path,
) -> None:
    base_url = "https://drive.google.com/uc"
    params: dict[str, str] = {"export": "download", "id": file_id}
    if resource_key:
        params["resourcekey"] = resource_key

    first = session.get(base_url, params=params, stream=True, timeout=120)
    if response_is_download(first):
        stream_to_file(first, out_path)
        return

    token = None
    for cookie_key, cookie_value in first.cookies.items():
        if cookie_key.startswith("download_warning"):
            token = cookie_value
            break

    if not token:
        token_match = re.search(r"confirm=([0-9A-Za-z_\-]+)", first.text)
        if token_match:
            token = token_match.group(1)

    if token:
        params["confirm"] = token
        second = session.get(base_url, params=params, stream=True, timeout=120)
        if response_is_download(second):
            stream_to_file(second, out_path)
            return

    raise RuntimeError("Could not resolve direct download URL")


def should_convert(path: Path, mime: str) -> bool:
    if path.suffix.lower() in CONVERTIBLE_EXTS:
        return True
    if mime.startswith("text/"):
        return True
    if mime in {
        "application/json",
        "application/xml",
        "application/rtf",
    }:
        return True
    return False


def markdown_output_path(markdown_root: Path, relative_file_path: Path) -> Path:
    if relative_file_path.suffix:
        out_name = relative_file_path.name + ".md"
        return markdown_root / relative_file_path.parent / out_name
    return markdown_root / relative_file_path.parent / f"{relative_file_path.name}.md"


def crawl_drive_tree(
    session: requests.Session,
    root_id: str,
    root_resource_key: str | None,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[str]]:
    folders: list[dict[str, Any]] = []
    files: list[dict[str, Any]] = []
    crawl_errors: list[str] = []

    queue = deque(
        [{"id": root_id, "resource_key": root_resource_key, "rel_path": Path()}]
    )
    visited_folders: set[str] = set()

    while queue:
        current = queue.popleft()
        folder_id = current["id"]
        folder_key = current["resource_key"]
        rel_path = current["rel_path"]

        if folder_id in visited_folders:
            continue
        visited_folders.add(folder_id)

        print(f"[crawl] folder={folder_id} path={rel_path}")

        try:
            entries = fetch_folder_entries(session, folder_id, folder_key)
        except Exception as exc:  # noqa: BLE001
            crawl_errors.append(
                f"{folder_id}: failed to fetch folder metadata ({exc})"
            )
            continue

        used_names: set[str] = set()

        for entry in entries:
            item_id = str(entry[0]) if len(entry) > 0 else ""
            name = str(entry[2]) if len(entry) > 2 else "untitled"
            mime = str(entry[3]) if len(entry) > 3 else "application/octet-stream"
            rk = item_resource_key(entry)
            link = item_url(entry)

            safe = sanitize_name(name)
            if mime in GOOGLE_EXPORT_MAP and Path(safe).suffix == "":
                safe = f"{safe}.{GOOGLE_EXPORT_MAP[mime][0]}"
            safe = unique_name(safe, used_names)

            item_rel_path = rel_path / safe

            record = {
                "id": item_id,
                "name": name,
                "mime": mime,
                "resource_key": rk,
                "url": link,
                "relative_path": str(item_rel_path),
                "parent_folder_id": folder_id,
            }

            if mime == FOLDER_MIME:
                folders.append(record)
                queue.append(
                    {
                        "id": item_id,
                        "resource_key": rk,
                        "rel_path": item_rel_path,
                    }
                )
            else:
                files.append(record)

    return folders, files, crawl_errors


def download_all_files(
    session: requests.Session,
    files: list[dict[str, Any]],
    original_root: Path,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    downloaded: list[dict[str, Any]] = []
    failed: list[dict[str, Any]] = []

    for idx, rec in enumerate(files, start=1):
        rel_path = Path(rec["relative_path"])
        out_path = original_root / rel_path
        mime = rec["mime"]
        file_id = rec["id"]
        rk = rec["resource_key"]

        print(f"[download {idx}/{len(files)}] {rel_path}")

        if out_path.exists() and out_path.stat().st_size > 0:
            rec["download_path"] = str(out_path)
            downloaded.append(rec)
            continue

        try:
            export_spec = build_export_request(file_id, mime, rk)
            if export_spec:
                export_url, params, _ext = export_spec
                resp = session.get(
                    export_url,
                    params=params,
                    stream=True,
                    timeout=120,
                    allow_redirects=True,
                )
                if not response_is_download(resp):
                    raise RuntimeError(
                        f"Export endpoint returned non-download content (HTTP {resp.status_code})"
                    )
                stream_to_file(resp, out_path)
            else:
                download_binary_drive_file(session, file_id, rk, out_path)

            rec["download_path"] = str(out_path)
            downloaded.append(rec)
        except Exception as exc:  # noqa: BLE001
            failed.append(
                {
                    "id": rec["id"],
                    "name": rec["name"],
                    "mime": rec["mime"],
                    "relative_path": rec["relative_path"],
                    "error": str(exc),
                }
            )

    return downloaded, failed


def convert_to_markdown(
    downloaded_files: list[dict[str, Any]],
    markdown_root: Path,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    converted: list[dict[str, Any]] = []
    skipped: list[dict[str, Any]] = []
    failed: list[dict[str, Any]] = []

    converter = MarkItDown()

    for idx, rec in enumerate(downloaded_files, start=1):
        source_path = Path(rec["download_path"])
        rel_path = Path(rec["relative_path"])
        mime = rec["mime"]

        if not should_convert(source_path, mime):
            skipped.append(
                {
                    "relative_path": str(rel_path),
                    "mime": mime,
                    "reason": "extension or MIME not in conversion allow-list",
                }
            )
            continue

        md_path = markdown_output_path(markdown_root, rel_path)

        print(f"[convert {idx}/{len(downloaded_files)}] {rel_path} -> {md_path.relative_to(markdown_root)}")

        try:
            result = converter.convert(str(source_path))
            text_content = (result.text_content or "").rstrip() + "\n"

            md_path.parent.mkdir(parents=True, exist_ok=True)
            md_path.write_text(text_content, encoding="utf-8")

            converted.append(
                {
                    "relative_path": str(rel_path),
                    "markdown_path": str(md_path),
                    "mime": mime,
                }
            )
        except Exception as exc:  # noqa: BLE001
            failed.append(
                {
                    "relative_path": str(rel_path),
                    "mime": mime,
                    "error": str(exc),
                }
            )

    return converted, skipped, failed


def write_manifest(
    out_dir: Path,
    source_url: str,
    root_id: str,
    root_resource_key: str | None,
    folders: list[dict[str, Any]],
    files: list[dict[str, Any]],
    crawl_errors: list[str],
    downloaded: list[dict[str, Any]],
    download_failures: list[dict[str, Any]],
    converted: list[dict[str, Any]],
    conversion_skipped: list[dict[str, Any]],
    conversion_failures: list[dict[str, Any]],
    elapsed_seconds: float,
) -> None:
    manifest = {
        "source": {
            "folder_url": source_url,
            "root_folder_id": root_id,
            "root_resource_key": root_resource_key,
        },
        "summary": {
            "folders_discovered": len(folders),
            "files_discovered": len(files),
            "crawl_errors": len(crawl_errors),
            "files_downloaded": len(downloaded),
            "download_failures": len(download_failures),
            "markdown_converted": len(converted),
            "markdown_skipped": len(conversion_skipped),
            "markdown_failures": len(conversion_failures),
            "elapsed_seconds": round(elapsed_seconds, 2),
        },
        "crawl_errors": crawl_errors,
        "download_failures": download_failures,
        "conversion_skipped": conversion_skipped,
        "conversion_failures": conversion_failures,
        "files": [
            {
                "id": f.get("id"),
                "name": f.get("name"),
                "mime": f.get("mime"),
                "relative_path": f.get("relative_path"),
                "download_path": f.get("download_path"),
                "resource_key": f.get("resource_key"),
                "url": f.get("url"),
            }
            for f in downloaded
        ],
    }

    out_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = out_dir / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")

    report = [
        "# Google Drive Import Report",
        "",
        f"- Source: {source_url}",
        f"- Root folder id: `{root_id}`",
        f"- Downloaded files: **{len(downloaded)}** / discovered **{len(files)}**",
        f"- Markdown conversions: **{len(converted)}**",
        f"- Conversion skipped: **{len(conversion_skipped)}**",
        f"- Download failures: **{len(download_failures)}**",
        f"- Conversion failures: **{len(conversion_failures)}**",
        f"- Elapsed: **{round(elapsed_seconds, 2)}s**",
        "",
        "## Output Paths",
        "",
        "- Original files: `original/`",
        "- Markdown files: `markdown/`",
        "- Machine-readable manifest: `manifest.json`",
    ]

    (out_dir / "README.md").write_text("\n".join(report) + "\n", encoding="utf-8")


def main() -> int:
    args = parse_args()
    started_at = time.time()

    root_id, root_resource_key = parse_folder_url(args.folder_url)

    output_dir = Path(args.output_dir)
    original_root = output_dir / "original"
    markdown_root = output_dir / "markdown"

    output_dir.mkdir(parents=True, exist_ok=True)
    original_root.mkdir(parents=True, exist_ok=True)
    markdown_root.mkdir(parents=True, exist_ok=True)

    session = build_session()

    print("[start] crawling Drive folder tree...")
    folders, files, crawl_errors = crawl_drive_tree(session, root_id, root_resource_key)
    print(f"[done] discovered folders={len(folders)} files={len(files)}")

    print("[start] downloading files...")
    downloaded, download_failures = download_all_files(session, files, original_root)
    print(
        "[done] downloaded={} failed={}".format(
            len(downloaded), len(download_failures)
        )
    )

    print("[start] converting to Markdown...")
    converted, conversion_skipped, conversion_failures = convert_to_markdown(
        downloaded, markdown_root
    )
    print(
        "[done] converted={} skipped={} failed={}".format(
            len(converted), len(conversion_skipped), len(conversion_failures)
        )
    )

    elapsed = time.time() - started_at

    write_manifest(
        out_dir=output_dir,
        source_url=args.folder_url,
        root_id=root_id,
        root_resource_key=root_resource_key,
        folders=folders,
        files=files,
        crawl_errors=crawl_errors,
        downloaded=downloaded,
        download_failures=download_failures,
        converted=converted,
        conversion_skipped=conversion_skipped,
        conversion_failures=conversion_failures,
        elapsed_seconds=elapsed,
    )

    print(
        "[summary] files discovered={} downloaded={} markdown={} download_failures={} conversion_failures={}".format(
            len(files), len(downloaded), len(converted), len(download_failures), len(conversion_failures)
        )
    )

    return 0 if not download_failures else 2


if __name__ == "__main__":
    sys.exit(main())
