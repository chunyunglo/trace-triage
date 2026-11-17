"""Lay out the final report in the same Word format as the proposal template."""

import copy
import os
import re
import sys
from pathlib import Path

from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.opc.constants import RELATIONSHIP_TYPE as RT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm

BASE = Path(__file__).resolve().parent.parent
# Word template supplying the course format (not included in the repository); set REPORT_TEMPLATE to its path.
TEMPLATE = Path(os.environ.get("REPORT_TEMPLATE", BASE / "report_template.docx"))


def main(md_path: Path, out_path: Path) -> None:
    d = Document(TEMPLATE)
    P = d.paragraphs
    T = {k: copy.deepcopy(P[i]._p) for k, i in dict(h=2, body=3, item=6, ref=14).items()}
    hl_rpr = copy.deepcopy(d.element.body.find(".//" + qn("w:hyperlink")).find(qn("w:r")).find(qn("w:rPr")))
    body = P[0]._p.getparent()
    for p in P[2:]:
        body.remove(p._p)
    sect = body.find(qn("w:sectPr"))

    def append(el):
        body.insert(list(body).index(sect), el)

    def run(rpr, text, italic=False, ea=False, bold=False, size=None):
        r = OxmlElement("w:r")
        rp = copy.deepcopy(rpr)
        for flag, tag in ((italic, "w:i"), (bold, "w:b")):
            if flag:
                rp.append(OxmlElement(tag))
        if ea:
            f = rp.find(qn("w:rFonts"))
            if f is None:
                f = OxmlElement("w:rFonts")
                rp.insert(0, f)
            f.set(qn("w:eastAsia"), "Times New Roman")
        if size:
            for tag in ("w:sz", "w:szCs"):
                for e in rp.findall(qn(tag)):
                    e.set(qn("w:val"), str(size))
        r.append(rp)
        t = OxmlElement("w:t")
        t.text = text
        t.set("{http://www.w3.org/XML/1998/namespace}space", "preserve")
        r.append(t)
        return r

    def fill(p, rpr, text, bold=False, size=None):
        url = None
        m = re.search(r"(https?://\S+)$", text)
        if m:
            url = m.group(1)
            text = text[: m.start()]
        for i, seg in enumerate(text.split("*")):
            for piece in re.split(r"(′)", seg):
                if piece:
                    p.append(run(rpr, piece, i % 2 == 1, piece == "′", bold, size))
        if url:
            h = OxmlElement("w:hyperlink")
            h.set(qn("r:id"), d.part.relate_to(url, RT.HYPERLINK, is_external=True))
            h.append(run(hl_rpr, url, size=size))
            p.append(h)

    def para(kind, text, bold=False, size=None, center=False):
        p = copy.deepcopy(T[kind])
        rpr = copy.deepcopy(p.find(qn("w:r")).find(qn("w:rPr")))
        for ch in list(p):
            if ch.tag != qn("w:pPr"):
                p.remove(ch)
        if center:
            jc = OxmlElement("w:jc")
            jc.set(qn("w:val"), "center")
            p.find(qn("w:pPr")).append(jc)
        fill(p, rpr, text, bold, size)
        append(p)
        return rpr

    body_rpr = copy.deepcopy(T["body"].find(qn("w:r")).find(qn("w:rPr")))

    def table(rows):
        tbl = d.add_table(rows=len(rows), cols=len(rows[0]))
        tbl.style = "Table Grid"
        tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        for r, row in enumerate(rows):
            for c, text in enumerate(row):
                cell = tbl.cell(r, c)
                p = cell.paragraphs[0]._p
                fill(p, body_rpr, text, bold=(r == 0), size=18)
                cell.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER if c else WD_ALIGN_PARAGRAPH.LEFT
                cell.paragraphs[0].paragraph_format.space_after = 0
        # Column widths follow the longest text in each column (CJK counts double).
        weight = [max(sum(2 if ord(ch) > 0x2E80 else 1 for ch in row[c]) for row in rows) + 2 for c in range(len(rows[0]))]
        total = sum(weight)
        tbl.autofit = False
        for c, w in enumerate(weight):
            for cell in tbl.columns[c].cells:
                cell.width = Cm(16 * w / total)
        el = tbl._tbl
        el.getparent().remove(el)
        append(el)

    lines = md_path.read_text().splitlines()
    title = lines[0][2:]
    P[0].runs[0].text = title + "（期末報告）"
    for r in P[0].runs[1:]:
        r.text = ""
    in_refs = False
    i = 3  # lines[2] repeats the template's name line
    while i < len(lines):
        line = lines[i].rstrip()
        i += 1
        if not line.strip():
            continue
        if line.startswith("## "):
            in_refs = line[3:] == "參考文獻"
            para("h", line[3:])
        elif line.startswith("### "):
            para("body", line[4:], bold=True)
        elif line.startswith("|"):
            rows = [line]
            while i < len(lines) and lines[i].startswith("|"):
                rows.append(lines[i])
                i += 1
            cells = [[c.strip() for c in r.strip("|").split("|")] for r in rows if not re.match(r"^\|[-|\s]+\|$", r)]
            table(cells)
        elif line.startswith("!["):
            cap, path = re.match(r"!\[(.*)\]\((.*)\)", line).groups()
            p = d.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.add_run().add_picture(str(BASE / path), width=Cm(15.5))
            el = p._p
            el.getparent().remove(el)
            append(el)
            para("body", cap, size=20, center=True)
        elif in_refs:
            para("ref", line, size=20)
        elif line.startswith("（") or re.match(r"^\d+\. ", line):
            para("item", line)
        elif line.startswith("表") or line.startswith("註："):
            para("body", line, size=20, bold=line.startswith("表"))
        else:
            para("body", line)
    d.save(out_path)


if __name__ == "__main__":
    main(Path(sys.argv[1]), Path(sys.argv[2]))
