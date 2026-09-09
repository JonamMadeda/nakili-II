import { jsPDF } from 'jspdf';

export interface ExportPage {
  title: string;
  content: string;
  date: string;
}

interface TextRun {
  text: string;
  bold: boolean;
  italic: boolean;
  strike: boolean;
  underline: boolean;
  lineBreak?: boolean;
}

function collectInlineRuns(node: Node, bold = false, italic = false, strike = false, underline = false): TextRun[] {
  const runs: TextRun[] = [];

  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || '';
    if (text) {
      runs.push({ text, bold, italic, strike, underline });
    }
    return runs;
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    if (tag === 'br') {
      return [{ text: '', bold, italic, strike, underline, lineBreak: true }];
    }
    if (tag === 'strong' || tag === 'b' || tag === 'th') bold = true;
    if (tag === 'em' || tag === 'i') italic = true;
    if (tag === 's' || tag === 'strike' || tag === 'del') strike = true;
    if (tag === 'u') underline = true;
    if (el.style.fontWeight === 'bold' || el.style.fontWeight === '700') bold = true;
    if (el.style.fontStyle === 'italic') italic = true;
    if (el.style.textDecoration?.includes('underline')) underline = true;
    if (el.style.textDecoration?.includes('line-through')) strike = true;

    for (const child of el.childNodes) {
      runs.push(...collectInlineRuns(child, bold, italic, strike, underline));
    }
  }

  return runs;
}

interface WordRun {
  text: string;
  w: number;
  bold: boolean;
  italic: boolean;
  strike: boolean;
  underline: boolean;
  lineBreak?: boolean;
}

function renderInlineRuns(
  doc: jsPDF,
  runs: TextRun[],
  x: number,
  startY: number,
  maxWidth: number,
  fontSize: number,
  lineHeight: number,
): number {
  let y = startY;

  function flushLine(lineWords: WordRun[]) {
    if (lineWords.length === 0) return;
    if (y > 265) { doc.addPage(); y = 20; }
    let cx = x;
    for (const lw of lineWords) {
      const fs = lw.bold && lw.italic ? 'bolditalic' : lw.bold ? 'bold' : lw.italic ? 'italic' : 'normal';
      doc.setFont('helvetica', fs);
      doc.setFontSize(fontSize);
      doc.text(lw.text, cx, y);
      if (lw.underline) {
        doc.setLineWidth(0.3);
        doc.line(cx, y + 1, cx + lw.w, y + 1);
      }
      if (lw.strike) {
        doc.setLineWidth(0.3);
        doc.line(cx, y - fontSize * 0.3, cx + lw.w, y - fontSize * 0.3);
      }
      cx += lw.w;
    }
    y += lineHeight;
  }

  let lineWords: WordRun[] = [];
  let lineWidth = 0;

  for (const run of runs) {
    if (run.lineBreak) {
      flushLine(lineWords);
      lineWords = [];
      lineWidth = 0;
      continue;
    }

    const words = run.text.match(/\S+\s*/g) || [];
    for (const word of words) {
      const fs = run.bold && run.italic ? 'bolditalic' : run.bold ? 'bold' : run.italic ? 'italic' : 'normal';
      doc.setFont('helvetica', fs);
      doc.setFontSize(fontSize);
      const w = doc.getTextWidth(word);

      if (lineWidth + w > maxWidth && lineWidth > 0) {
        flushLine(lineWords);
        lineWords = [];
        lineWidth = 0;
      }

      lineWords.push({ text: word, w, bold: run.bold, italic: run.italic, strike: run.strike, underline: run.underline });
      lineWidth += w;
    }
  }

  flushLine(lineWords);

  return y;
}

function renderHtmlContent(doc: jsPDF, html: string, x: number, startY: number, maxWidth: number): number {
  let y = startY;
  const parser = new DOMParser();
  const doc2 = parser.parseFromString(html, 'text/html');
  const body = doc2.body;

  function checkPage() {
    if (y > 265) { doc.addPage(); y = 20; }
  }

  for (const child of Array.from(body.children)) {
    const el = child as HTMLElement;
    const tag = el.tagName.toLowerCase();

    if (tag.startsWith('h')) {
      const level = parseInt(tag[1]) || 1;
      const fontSize = Math.max(22 - level * 4, 14);
      checkPage();
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0);
      y += 2;
      y = renderInlineRuns(doc, collectInlineRuns(el), x, y, maxWidth, fontSize, fontSize * 0.35 + 6);
      y += 6;
    } else if (tag === 'ul' || tag === 'ol') {
      const isOrdered = tag === 'ol';
      let idx = 0;
      for (const li of Array.from(el.children)) {
        if (li.tagName.toLowerCase() !== 'li') continue;
        idx++;
        checkPage();
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0);
        const runs = collectInlineRuns(li);
        const prefix = isOrdered ? `${idx}. ` : '• ';
        y = renderInlineRuns(doc, [{ text: prefix, bold: false, italic: false, strike: false, underline: false }, ...runs], x, y, maxWidth - 10, 11, 5.5);
        y += 1;
      }
      y += 4;
    } else if (tag === 'blockquote') {
      checkPage();
      doc.setFontSize(11);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100);
      y += 1;
      y = renderInlineRuns(doc, collectInlineRuns(el), x + 10, y, maxWidth - 20, 11, 5.5);
      doc.setTextColor(0);
      y += 5;
    } else if (tag === 'pre') {
      checkPage();
      doc.setFontSize(9);
      doc.setFont('courier', 'normal');
      doc.setTextColor(0);
      const text = el.textContent?.trim();
      if (text) {
        const split = doc.splitTextToSize(text, maxWidth - 10);
        split.forEach((line: string) => {
          if (y > 270) { doc.addPage(); y = 20; }
          doc.text(line, x + 5, y);
          y += 4.5;
        });
      }
      y += 4;
    } else {
      if (!el.textContent?.trim()) continue;
      checkPage();
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0);
      y = renderInlineRuns(doc, collectInlineRuns(el), x, y, maxWidth, 11, 5.5);
      y += 6;
    }
  }

  return y;
}

function sanitize(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9]/g, '-');
}

export function exportBookPdf(bookTitle: string, pages: ExportPage[]): void {
  if (!bookTitle || pages.length === 0) return;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yOffset = 20;

  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(bookTitle, pageWidth / 2, yOffset, { align: 'center' });
  yOffset += 15;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(128);
  doc.text(`Exported on ${new Date().toLocaleDateString()}`, pageWidth / 2, yOffset, { align: 'center' });
  yOffset += 15;

  pages.forEach((page, index) => {
    if (yOffset > 250) {
      doc.addPage();
      yOffset = 20;
    }

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text(page.title, 20, yOffset);
    yOffset += 8;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(128);
    doc.text(`Page ${index + 1} - ${new Date(page.date).toLocaleDateString()}`, 20, yOffset);
    yOffset += 8;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0);

    yOffset = renderHtmlContent(doc, page.content, 20, yOffset, pageWidth - 40);

    yOffset += 10;
  });

  const filename = `${sanitize(bookTitle)}-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}

export function exportPagePdf(bookTitle: string, page: ExportPage): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yOffset = 20;

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(page.title, 20, yOffset);
  yOffset += 10;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(128);
  doc.text(`${new Date(page.date).toLocaleDateString()}`, 20, yOffset);
  yOffset += 10;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0);

  yOffset = renderHtmlContent(doc, page.content, 20, yOffset, pageWidth - 40);

  const filename = `${sanitize(bookTitle)}-${sanitize(page.title)}.pdf`;
  doc.save(filename);
}
