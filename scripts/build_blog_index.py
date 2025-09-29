from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BLOGS_DIR = ROOT / "blogs"
OUTPUT_PATH = BLOGS_DIR / "index.json"
HEADING_PATTERN = re.compile(r"^\s*#\s+(.+)$")


def derive_title(markdown_path: Path) -> str:
    try:
        with markdown_path.open("r", encoding="utf-8") as handle:
            for line in handle:
                line = line.lstrip("\ufeff")
                match = HEADING_PATTERN.match(line)
                if match:
                    return match.group(1).strip()
    except OSError:
        pass
    slug = markdown_path.stem.replace('-', ' ').replace('_', ' ')
    words = [word.capitalize() for word in slug.split() if word]
    return " ".join(words) if words else markdown_path.stem


def build_manifest() -> dict:
    posts = []
    for path in sorted(BLOGS_DIR.glob("*.md")):
        if not path.is_file():
            continue
        stat = path.stat()
        title = derive_title(path)
        posts.append({
            "path": f"blogs/{path.name}",
            "filename": path.name,
            "title": title,
            "lastModified": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat(),
            "size": stat.st_size,
            "_sort": stat.st_mtime,
        })
    posts.sort(key=lambda item: (item["_sort"], item["filename"]), reverse=True)
    for post in posts:
        post.pop("_sort", None)
    return {
        "generatedAt": datetime.now(tz=timezone.utc).isoformat(),
        "posts": posts,
    }


def main() -> None:
    BLOGS_DIR.mkdir(parents=True, exist_ok=True)
    manifest = build_manifest()
    payload = json.dumps(manifest, indent=2) + "\n"
    if OUTPUT_PATH.exists():
        OUTPUT_PATH.unlink()
    OUTPUT_PATH.write_text(payload, encoding="utf-8")
    print(f"Wrote {len(manifest['posts'])} posts to {OUTPUT_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
