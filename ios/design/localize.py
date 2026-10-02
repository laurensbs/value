"""Fills the app's string catalogs with the translations in translations.py.

Run from ios/: python3 design/localize.py
It exports the strings Xcode finds in the code, adds English, French and Spanish, and imports them back.
"""
import html, os, re, shutil, subprocess, sys, tempfile

sys.path.insert(0, os.path.dirname(__file__))
from translations import T  # noqa: E402

LANGS = {"en": 0, "fr": 1, "es": 2}
SAME = {"CFBundleDisplayName", "CFBundleName"}
tmp = tempfile.mkdtemp()
args = ["xcodebuild", "-exportLocalizations", "-project", "Rondje.xcodeproj", "-localizationPath", tmp, "-sdk", "iphonesimulator"]
for lang in LANGS:
    args += ["-exportLanguage", lang]
subprocess.run(args, check=True, capture_output=True)

missing = set()
for lang, i in LANGS.items():
    path = os.path.join(tmp, f"{lang}.xcloc", "Localized Contents", f"{lang}.xliff")
    x = open(path, encoding="utf-8").read()

    def fill(m):
        unit = m.group(0)
        key = html.unescape(m.group(1))
        source = re.search(r"<source>(.*?)</source>", unit, re.S).group(1)
        if key in SAME:
            value = html.unescape(source)
        elif key in T:
            value = T[key][i]
        else:
            missing.add(key)
            return unit
        unit = re.sub(r"\s*<target[^>]*>.*?</target>", "", unit, flags=re.S)
        return unit.replace("</source>", f'</source>\n        <target state="translated">{html.escape(value, quote=False)}</target>', 1)

    x = re.sub(r'<trans-unit id="([^"]*)"[^>]*>.*?</trans-unit>', fill, x, flags=re.S)
    open(path, "w", encoding="utf-8").write(x)
    subprocess.run(["xcodebuild", "-importLocalizations", "-project", "Rondje.xcodeproj", "-localizationPath", os.path.join(tmp, f"{lang}.xcloc")], check=True, capture_output=True)

shutil.rmtree(tmp)
if missing:
    print("Not translated yet:", *sorted(missing), sep="\n  ")
else:
    print("All strings translated.")

# The Dutch purpose texts must exist as a translation too: without an nl entry, iOS falls back to
# English on a Dutch phone for Info.plist strings (seen in the simulator).
import json, plistlib  # noqa: E402

for catalog, plist in [("Rondje/Resources/InfoPlist.xcstrings", "Rondje/Resources/Info.plist")]:
    info = plistlib.load(open(plist, "rb"))
    data = json.load(open(catalog, encoding="utf-8"))
    for key, entry in data["strings"].items():
        value = info.get(key)
        if isinstance(value, str) and not value.startswith("$("):
            entry.setdefault("localizations", {})["nl"] = {"stringUnit": {"state": "translated", "value": value}}
    json.dump(data, open(catalog, "w", encoding="utf-8"), ensure_ascii=False, indent=2, sort_keys=True)
    print("Dutch Info.plist texts added to", catalog)
