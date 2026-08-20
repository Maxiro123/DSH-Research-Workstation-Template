---
name: pdf-reading
description: Read and extract content from PDF files using the pdfread CLI tool — text, tables, metadata, table of contents, and page renders. Use when the user wants to read, inspect, or extract information from a PDF.
---

# pdf-reading

Extract content from PDF files with the `pdfread` command. Backed by PyMuPDF (pymupdf) and pdfplumber; requires Python ≥ 3.9 with `pip install "pymupdf>=1.24" pdfplumber` (install `pdfread` first: copy `tools/pdfread.cmd` and `tools/pdfread.py` from this project into a directory on your PATH, or run the project's `install-windows.ps1` / `install-macos-linux.sh`).

## Invocation

`pdfread` is expected on PATH. All paths may be absolute or relative to the working directory.

```powershell
pdfread <file>                   # Extract text from all pages (page markers)
pdfread <file> --pages 1-3,5     # Extract text from specific pages (1-based)
pdfread <file> --info            # Metadata + page count (JSON)
pdfread <file> --tables          # Tables as JSON (pdfplumber; per page)
pdfread <file> --toc             # Bookmarks / table of contents (JSON)
pdfread <file> --render <dir>    # Render selected pages to PNG (150 dpi)
pdfread <file> --json            # Text extraction wrapped in JSON
```

## Strategy

1. **First** run `pdfread <file> --info` to learn page count and metadata (title/author/creator).
2. **Then** extract text with `pdfread <file> --pages N-M` for the relevant range — do not dump a 200-page PDF at once; page ranges keep output bounded.
3. **Tables**: use `--tables` when the PDF contains tabular data; pdfplumber returns a JSON list of row arrays per page. Empty result usually means the table has no ruled lines (scanned/image PDF).
4. **Scanned PDFs** (no extractable text): `pdfread <file> --pages N --render <dir>` produces PNG images of pages. To read the content, open the rendered PNG with an image-capable tool (read_image) — OCR is not bundled.
5. **TOC**: `--toc` returns the bookmark tree as `[level, title, page]` triples — useful for navigation in long documents.

## Notes

- Text output is UTF-8; on legacy consoles characters may display as `?` — that is a display artifact, the underlying bytes are correct (write output to a file if verification is needed).
- For generating PDFs (rather than reading), prefer `officecli` for Office documents; `pdfread` only reads.
- If a page yields `[no extractable text]`, the page is likely image-only — use `--render` and read the image.
