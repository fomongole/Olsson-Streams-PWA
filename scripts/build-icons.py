#!/usr/bin/env python3
"""Subset the Material Symbols Rounded variable font down to the icons in
scripts/material-symbols.icons.json.

Why this exists: the full font is ~5.4 MB, which is far too heavy to ship to
phones on mobile data. Subsetting by *glyph name* (not by typed characters)
keeps the output around 42 KB while still letting the usual ligature usage
(<span class="msym">home</span>) work.

Setup (one-time, creates .venv-icons automatically on first run):
    npm run icons

Manual setup, if you prefer:
    python3 -m venv .venv-icons
    .venv-icons/bin/pip install --upgrade fonttools brotli

Run it:
    npm run icons
    PYFTSUBSET=/path/to/pyftsubset npm run icons   # optional override

Notes:
  * fonttools + brotli do the subsetting and woff2 compression.
  * Unicode-based subsetting cannot be used here: GSUB ligature closure on
    this font pulls in all ~6600 glyphs and produces a ~5.3 MB file. We walk
    the rlig lookups ourselves and hand pyftsubset an explicit glyph list
    with --no-layout-closure, which keeps the output ~42 KB.
  * The source font is not committed. The script downloads the Google Fonts
    copy into .font-cache/ on first run and reuses it afterwards.
"""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ICONS_JSON = ROOT / "scripts" / "material-symbols.icons.json"
OUT_FONT = ROOT / "public" / "fonts" / "material-symbols-rounded.woff2"
ICONS_MODULE = ROOT / "src" / "components" / "ui" / "icons.generated.ts"
CACHE_DIR = ROOT / ".font-cache"

# Google Fonts variable font (opsz/wght/FILL/GRAD). If this URL ever 404s,
# grab a fresh one from https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded
SOURCE_URL = (
    "https://fonts.gstatic.com/s/materialsymbolsrounded/v378/"
    "sykg-zNym6YjUruM-QrEh7-nyTnjDwKNJ_190FjzaqkNCeE.woff2"
)
SOURCE_FONT = CACHE_DIR / "material-symbols-rounded-full.woff2"


def venv_python() -> Path:
    for name in ("python3", "python"):
        cand = ROOT / ".venv-icons" / "bin" / name
        if cand.exists():
            return cand
    return None


def ensure_deps() -> None:
    """Re-exec under .venv-icons when fontTools is missing."""
    try:
        import fontTools  # noqa: F401
        import brotli  # noqa: F401
        return
    except ImportError:
        pass

    py = venv_python()
    if py is None:
        py = create_venv()

    os.execv(str(py), [str(py), str(Path(__file__).resolve()), *sys.argv[1:]])


def create_venv() -> Path:
    """Create .venv-icons and install the subsetter dependencies."""
    venv_dir = ROOT / ".venv-icons"
    print(f"Creating virtualenv at {venv_dir} ...")
    subprocess.run([sys.executable, "-m", "venv", str(venv_dir)], check=True)
    pip = venv_dir / "bin" / "pip"
    print("Installing fonttools, brotli ...")
    subprocess.run(
        [str(pip), "install", "--upgrade", "fonttools", "brotli"],
        check=True,
    )
    return venv_dir / "bin" / "python3"


def find_pyftsubset() -> str:
    override = os.environ.get("PYFTSUBSET") or shutil.which("pyftsubset")
    if override:
        return override
    venv = ROOT / ".venv-icons" / "bin" / "pyftsubset"
    if venv.exists():
        return str(venv)
    sys.exit(
        "pyftsubset not found.\n"
        "Set it up once with:\n"
        "    python3 -m venv .venv-icons\n"
        "    .venv-icons/bin/pip install --upgrade fonttools brotli"
    )


def ensure_source_font() -> Path:
    if SOURCE_FONT.exists() and SOURCE_FONT.stat().st_size > 1_000_000:
        return SOURCE_FONT
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Downloading source font to {SOURCE_FONT} ...")
    urllib.request.urlretrieve(SOURCE_URL, SOURCE_FONT)
    return SOURCE_FONT


def load_icon_names() -> list[str]:
    data = json.loads(ICONS_JSON.read_text())
    names = data.get("icons")
    if not isinstance(names, list) or not names:
        sys.exit(f"{ICONS_JSON} must contain a non-empty 'icons' array")
    return [str(n) for n in names]


# Ligature components are glyph names, not characters. Letters are named after
# themselves, but these are not -- map them back to the text a user types.
_DIGIT_GLYPHS = {
    "digit_zero": "0",
    "digit_one": "1",
    "digit_two": "2",
    "digit_three": "3",
    "digit_four": "4",
    "digit_five": "5",
    "digit_six": "6",
    "digit_seven": "7",
    "digit_eight": "8",
    "digit_nine": "9",
}


def component_text(components) -> str:
    """Rebuild the typed name a rule spells, e.g. ("r","e","p","l","a","y",
    "underscore","digit_one","digit_zero") -> "replay_10".

    Without the digit map every icon whose name carries a numeral ("replay_10",
    "forward_10") reconstructs as "replay_digit_one_digit_zero" and is reported
    as missing, even though the rule is right there in the font.
    """
    out = []
    for component in components:
        if component == "space":
            out.append(" ")
        elif component == "underscore":
            out.append("_")
        else:
            out.append(_DIGIT_GLYPHS.get(component, component))
    return "".join(out)


def required_component_glyphs(source: Path) -> set[str]:
    """Collect every glyph the icons' ligature rules need to survive subsetting.

    Reads rlig lookups out of GSUB directly. Each rule needs three things kept
    in the subset, or pyftsubset drops it:

      * the first component glyph (LigatureSubst is keyed by it)
      * the remaining component glyphs (Ligature.Component)
      * the OUTPUT glyph (Ligature.LigGlyph) -- this is the actual icon

    Component names are glyph names, not characters: the word separator in
    "wifi_off" is the "_" character, but its glyph is named "underscore", and
    the numerals in "replay_10" are "digit_one"/"digit_zero". See
    component_text() for the full translation.
    """
    from fontTools.ttLib import TTFont

    tt = TTFont(str(source))
    gsub = tt["GSUB"].table
    wanted = set(load_icon_names())
    needed: set[str] = set()
    matched: set[str] = set()

    for record in gsub.FeatureList.FeatureRecord:
        if record.FeatureTag != "rlig":
            continue
        for lookup_index in record.Feature.LookupListIndex:
            lookup = gsub.LookupList.Lookup[lookup_index]
            for subtable in lookup.SubTable:
                real = (
                    subtable.ExtSubTable
                    if getattr(subtable, "ExtensionLookupType", None)
                    else subtable
                )
                ligatures = getattr(real, "ligatures", None) or {}
                # LigatureSubst.ligatures maps the FIRST component's glyph
                # NAME to Ligature entries; Ligature.Component holds the
                # remaining component glyph NAMES; LigGlyph is the OUTPUT
                # glyph name (which is what we must keep to render the icon).
                for first_glyph, entries in ligatures.items():
                    for entry in entries:
                        components = (first_glyph, *entry.Component)
                        name = component_text(components)
                        if name in wanted:
                            needed.update(components)
                            needed.add(entry.LigGlyph)
                            matched.add(name)

    tt.close()
    unmatched = sorted(wanted - matched)
    if unmatched:
        sys.exit(
            "No rlig ligature rule found for: "
            + ", ".join(unmatched)
            + "\nThe source font layout may have changed."
        )
    return needed


def validate_glyphs(needed: set[str]) -> None:
    """Fail early with a readable message instead of pyftsubset's traceback."""
    from fontTools.ttLib import TTFont

    tt = TTFont(str(SOURCE_FONT))
    present = set(tt.getGlyphOrder())
    tt.close()
    missing = sorted(needed - present)
    if missing:
        sys.exit(
            "These glyph names are missing from the source font: "
            + ", ".join(missing)
            + "\nMost likely an icon name in scripts/material-symbols.icons.json "
            "does not exist in Material Symbols Rounded."
        )


def verify_subset(needed: set[str]) -> None:
    """Cross-check that every icon still has a ligature rule in the output.

    pyftsubset renames glyphs when it dedupes (e.g. "home" -> "HOME"), so this
    matches case-insensitively. A rule is only kept if ALL of its component
    glyphs survived -- if this fails, a component is missing from the list
    passed to pyftsubset.
    """
    from fontTools.ttLib import TTFont

    tt = TTFont(str(OUT_FONT))
    if "GSUB" not in tt:
        sys.exit("Subset font has no GSUB table; ligatures were dropped.")
    gsub = tt["GSUB"].table

    present: set[str] = set()
    for record in gsub.FeatureList.FeatureRecord:
        if record.FeatureTag != "rlig":
            continue
        for lookup_index in record.Feature.LookupListIndex:
            lookup = gsub.LookupList.Lookup[lookup_index]
            for subtable in lookup.SubTable:
                real = (
                    subtable.ExtSubTable
                    if getattr(subtable, "ExtensionLookupType", None)
                    else subtable
                )
                for first_glyph, entries in (getattr(real, "ligatures", None) or {}).items():
                    for entry in entries:
                        present.add(
                            component_text((first_glyph, *entry.Component))
                        )
    tt.close()

    missing = [n for n in load_icon_names() if n.upper() not in {p.upper() for p in present}]
    if missing:
        sys.exit(
            "Ligature rules missing from the subset (component glyphs were "
            "dropped): " + ", ".join(missing)
        )


def write_icon_module(names: list[str]) -> Path:
    """Emit a typed IconName union so the UI can't drift from the subset."""
    lines = "\n".join(f"  | '{name}'" for name in names)
    content = (
        "// Generated by scripts/build-icons.py -- do not edit by hand.\n"
        "// Source of truth: scripts/material-symbols.icons.json\n"
        f"export type IconName =\n{lines}\n"
    )
    ICONS_MODULE.write_text(content)
    return ICONS_MODULE


def main() -> None:
    ensure_deps()
    pyftsubset = find_pyftsubset()
    source = ensure_source_font()

    # A GSUB ligature rule is "component glyph list" -> one output glyph. With
    # --no-layout-closure, pyftsubset prunes any rule whose components are not
    # ALL present. So we must keep every component glyph of every icon rule
    # (the letters plus the separator), not just the output glyphs — otherwise
    # the rule is silently dropped and the name stops rendering. The separator
    # between words is the literal "_" character, whose glyph is named
    # "underscore" (not "space").
    needed = required_component_glyphs(source)
    validate_glyphs(needed)
    all_glyphs = sorted(needed)

    cmd = [
        pyftsubset,
        str(source),
        "--glyphs=" + ",".join(all_glyphs),
        "--layout-features=*",
        "--no-layout-closure",
        # Keep the original glyph names. Without this pyftsubset regenerates
        # them from cmap, so "digit_one" comes back as "one" and the verify
        # step can no longer reconstruct the ligature a name like "replay_10"
        # spells.
        "--glyph-names",
        "--flavor=woff2",
        f"--output-file={OUT_FONT}",
    ]
    print("Running pyftsubset ...")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.stdout.strip():
        print(result.stdout.strip())
    if result.returncode != 0:
        sys.stderr.write(result.stderr)
        sys.exit(f"pyftsubset failed with exit code {result.returncode}")
    if result.stderr.strip():
        print(result.stderr.strip(), file=sys.stderr)
    verify_subset(needed)
    module = write_icon_module(load_icon_names())
    size = OUT_FONT.stat().st_size
    print(
        f"Wrote {OUT_FONT} ({size / 1024:.1f} KB, "
        f"{len(load_icon_names())} icons, {len(all_glyphs)} glyphs)"
    )
    print(f"Wrote {module} (IconName type)")


if __name__ == "__main__":
    main()
