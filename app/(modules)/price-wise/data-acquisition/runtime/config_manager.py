"""Utility helpers to read and update scraper configuration."""
from __future__ import annotations

import argparse
import json
import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable

CONFIG_FILE = Path(__file__).with_name("config.py")

ALLOWED_KEYS = {
    "OCCUPANCY_MODE": bool,
    "DAYS_AHEAD": int,
    "OCCUPANCY_CHECK_INTERVAL": int,
    "CHECK_IN_OFFSETS": list,
    "STAY_DURATIONS": list,
    "GUESTS": int,
    "ROOMS": int,
    "REFERENCE_PROPERTY": str,
    "HEADLESS": bool,
    "BROWSER_TIMEOUT": int,
    "ENABLE_ARCHIVING": bool,
    "MAX_ARCHIVE_FILES": int,
    "SHOW_PROGRESS": bool,
    "PROGRESS_INTERVAL": int,
}


def _python_literal(value: Any) -> str:
    if isinstance(value, bool):
        return "True" if value else "False"
    if isinstance(value, (int, float)):
        return repr(value)
    if isinstance(value, str):
        escaped = value.replace("\\", "\\\\").replace("\"", "\\\"")
        return f'"{escaped}"'
    if isinstance(value, Iterable) and not isinstance(value, (str, bytes, bytearray)):
        return "[" + ", ".join(_python_literal(item) for item in value) + "]"
    raise TypeError(f"Unsupported type for serialization: {type(value)!r}")


def _read_config_module() -> Dict[str, Any]:
    import importlib.util

    spec = importlib.util.spec_from_file_location("scraper_config_runtime", CONFIG_FILE)
    if spec is None or spec.loader is None:
        raise RuntimeError("Unable to load config module")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)  # type: ignore[misc]

    payload: Dict[str, Any] = {}
    for key in ALLOWED_KEYS:
        if hasattr(module, key):
            value = getattr(module, key)
            if isinstance(value, Path):
                payload[key] = str(value)
            elif hasattr(value, "tolist"):
                payload[key] = list(value.tolist())  # type: ignore[attr-defined]
            else:
                payload[key] = value
    # Help clients by including derived values that are useful context
    if hasattr(module, "REQUEST_DELAY"):
        payload["REQUEST_DELAY"] = getattr(module, "REQUEST_DELAY")
    if hasattr(module, "get_mode_name"):
        payload["MODE_NAME"] = getattr(module, "get_mode_name")()
    return payload


@dataclass
class Replacement:
    key: str
    literal: str

    def apply(self, text: str) -> str:
        pattern = re.compile(
            rf"^(?P<prefix>\s*{self.key}\s*=\s*)(?P<value>.*?)(?P<comment>\s*#.*)?$",
            re.MULTILINE,
        )

        def repl(match: re.Match[str]) -> str:
            prefix = match.group("prefix")
            comment = match.group("comment") or ""
            return f"{prefix}{self.literal}{comment}"

        if not pattern.search(text):
            raise KeyError(f"Unable to find config entry for {self.key}")
        return pattern.sub(repl, text, count=1)


def _build_replacements(update: Dict[str, Any]) -> Dict[str, Replacement]:
    replacements: Dict[str, Replacement] = {}
    for key, expected_type in ALLOWED_KEYS.items():
        if key not in update:
            continue
        value = update[key]
        if expected_type is list:
            if not isinstance(value, list):
                raise TypeError(f"Expected list for {key}")
        elif not isinstance(value, expected_type):
            raise TypeError(f"Expected {expected_type.__name__} for {key}")
        replacements[key] = Replacement(key=key, literal=_python_literal(value))
    return replacements


def handle_get() -> None:
    payload = _read_config_module()
    print(json.dumps(payload, indent=2, default=str))


def handle_set(payload: Dict[str, Any]) -> None:
    replacements = _build_replacements(payload)
    if not replacements:
        return
    original = CONFIG_FILE.read_text(encoding="utf-8")
    updated = original
    for replacement in replacements.values():
        updated = replacement.apply(updated)
    CONFIG_FILE.write_text(updated, encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Manage scraper configuration")
    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("get")
    set_parser = subparsers.add_parser("set")
    set_parser.add_argument(
        "--env",
        default="CONFIG_PAYLOAD",
        help="Environment variable containing JSON payload",
    )

    args = parser.parse_args()

    if args.command == "get":
        handle_get()
        return

    payload_env = os.environ.get(args.env)
    if not payload_env:
        raise SystemExit("Missing configuration payload")
    try:
        payload = json.loads(payload_env)
    except json.JSONDecodeError as exc:
        raise SystemExit(f"Invalid JSON payload: {exc}") from exc

    if not isinstance(payload, dict):
        raise SystemExit("Config payload must be a JSON object")

    handle_set(payload)


if __name__ == "__main__":
    main()