#!/usr/bin/env python3
"""pdfread — AI-friendly PDF reader.

Reads text, tables, metadata, and rendered page images from PDF files.
Requires: Python >= 3.9, pip install "pymupdf>=1.24" pdfplumber

Usage:
  pdfread <file>                     Extract text (all pages, page markers)
  pdfread <file> --pages 1-3,5       Extract text from specific pages
  pdfread <file> --info              Document metadata + page count
  pdfread <file> --tables            Extract tables as JSON (pdfplumber)
  pdfread <file> --toc               Table of contents / bookmarks
  pdfread <file> --render <dir>      Render pages to PNG images
  pdfread <file> --json              Emit JSON (text mode)
"""
import argparse
import json
import os
import sys

# Force UTF-8 on stdout/stderr so extracted text survives any console codepage.
for stream in (sys.stdout, sys.stderr):
    try:
        stream.reconfigure(encoding='utf-8', errors='replace')
    except (AttributeError, ValueError):
        pass

def _require(module, package):
    try:
        return __import__(module)
    except ImportError:
        sys.stderr.write(f'error: 缺少依赖 {package}，请运行: pip install "{package}"\n')
        sys.exit(1)

def main():
    ap = argparse.ArgumentParser(description='AI-friendly PDF reader')
    ap.add_argument('file', help='PDF file path')
    ap.add_argument('--pages', help='Page selection, e.g. 1-3,5 (1-based)')
    ap.add_argument('--info', action='store_true', help='Print metadata only')
    ap.add_argument('--tables', action='store_true', help='Extract tables as JSON')
    ap.add_argument('--toc', action='store_true', help='Print table of contents')
    ap.add_argument('--render', metavar='DIR', help='Render pages to PNG in DIR')
    ap.add_argument('--json', action='store_true', help='JSON output where supported')
    args = ap.parse_args()

    path = os.path.abspath(args.file)
    if not os.path.isfile(path):
        print(f'error: file not found: {path}', file=sys.stderr)
        sys.exit(1)

    # PyMuPDF >= 1.24 exposes `pymupdf`; older releases only ship `fitz`.
    try:
        import pymupdf
    except ImportError:
        try:
            import fitz as pymupdf
        except ImportError:
            sys.stderr.write('error: 缺少依赖 pymupdf，请运行: pip install "pymupdf>=1.24"\n')
            sys.exit(1)

    doc = pymupdf.open(path)

    def selected_pages():
        if not args.pages:
            return list(range(doc.page_count))
        out = []
        try:
            for part in args.pages.split(','):
                part = part.strip()
                if '-' in part:
                    a, b = part.split('-', 1)
                    out.extend(range(int(a) - 1, int(b)))
                elif part:
                    out.append(int(part) - 1)
        except ValueError:
            print(f'error: invalid --pages: {args.pages}', file=sys.stderr)
            sys.exit(2)
        return [p for p in out if 0 <= p < doc.page_count]

    if args.info:
        md = doc.metadata or {}
        info = {
            'file': path,
            'pages': doc.page_count,
            'title': md.get('title') or '',
            'author': md.get('author') or '',
            'subject': md.get('subject') or '',
            'keywords': md.get('keywords') or '',
            'creator': md.get('creator') or '',
            'producer': md.get('producer') or '',
            'creationDate': md.get('creationDate') or '',
            'modDate': md.get('modDate') or '',
        }
        print(json.dumps(info, ensure_ascii=False, indent=2))
        sys.exit(0)

    if args.toc:
        toc = doc.get_toc()
        if not toc:
            print('[]')
            sys.exit(0)
        print(json.dumps(toc, ensure_ascii=False, indent=2))
        sys.exit(0)

    if args.tables:
        try:
            import pdfplumber
        except ImportError:
            sys.stderr.write('error: 缺少依赖 pdfplumber，请运行: pip install pdfplumber\n')
            sys.exit(1)
        pages = selected_pages()
        result = {}
        with pdfplumber.open(path) as pdf:
            for pno in pages:
                page = pdf.pages[pno]
                tables = page.extract_tables()
                if tables:
                    result[f'page{pno + 1}'] = tables
        print(json.dumps(result, ensure_ascii=False, indent=2))
        sys.exit(0)

    if args.render:
        outdir = os.path.abspath(args.render)
        os.makedirs(outdir, exist_ok=True)
        written = []
        for pno in selected_pages():
            page = doc[pno]
            pix = page.get_pixmap(dpi=150)
            name = f'page{pno + 1:03d}.png'
            target = os.path.join(outdir, name)
            pix.save(target)
            written.append(target)
        print(json.dumps({'rendered': written}, ensure_ascii=False, indent=2))
        sys.exit(0)

    # Default: text extraction
    out = []
    for pno in selected_pages():
        text = doc[pno].get_text('text').strip()
        out.append(f'----- page {pno + 1} -----')
        out.append(text if text else '[no extractable text]')
    payload = '\n'.join(out)
    if args.json:
        print(json.dumps({'file': path, 'text': payload}, ensure_ascii=False, indent=2))
    else:
        print(payload)

if __name__ == '__main__':
    main()
