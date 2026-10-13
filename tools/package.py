"""Package only the public offline application; never include project state or credentials."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parents[1]
dist = root / "docs"
files = [dist / name for name in ("index.html", "styles.css", "engine.js", "app.js", "OFFLINE-README.txt")]
files += sorted((dist / "samples").glob("*.csv"))
assert all(file.is_file() for file in files), "Missing offline application file"
destination = dist / "downloads" / "paircheck-offline.zip"
destination.parent.mkdir(parents=True, exist_ok=True)
with ZipFile(destination, "w", ZIP_DEFLATED) as archive:
    for file in files:
        archive.write(file, file.relative_to(dist))
with ZipFile(destination) as archive:
    assert archive.testzip() is None
    assert set(archive.namelist()) == {str(file.relative_to(dist)).replace("\\", "/") for file in files}
print(f"Offline package verified: {destination} ({destination.stat().st_size:,} bytes)")
