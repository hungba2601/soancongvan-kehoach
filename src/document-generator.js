import {
  Document, Packer, Paragraph, TextRun, AlignmentType,
  TabStopPosition, TabStopType, BorderStyle,
  convertMillimetersToTwip, Header, Footer,
  UnderlineType, Table, TableRow, TableCell,
  WidthType, VerticalAlign, LineRuleType
} from 'docx';
import { saveAs } from 'file-saver';

// ===== CONSTANTS: Vietnamese document standards (NĐ 30/2020) =====
const FONT = 'Times New Roman';
const FONT_SIZE = 28;       // 14pt (28 half-points) - cỡ chữ nội dung chuẩn
const FONT_SIZE_13 = 26;    // 13pt
const FONT_SIZE_12 = 24;    // 12pt
const FONT_SIZE_11 = 22;    // 11pt
const LINE_SPACING = 360;   // exactly 1.5 lines (240 twips * 1.5)
const FIRST_LINE_INDENT = convertMillimetersToTwip(12.7); // 1.27cm thụt đầu dòng
const PARA_SPACING_BEFORE = 60;  // 3pt before
const PARA_SPACING_AFTER = 60;   // 3pt after

/**
 * Format a date object to Vietnamese date string
 */
function formatDateVN(dateStr) {
  if (!dateStr) {
    const now = new Date();
    return `ngày ${now.getDate()} tháng ${now.getMonth() + 1} năm ${now.getFullYear()}`;
  }
  const d = new Date(dateStr);
  return `ngày ${d.getDate()} tháng ${d.getMonth() + 1} năm ${d.getFullYear()}`;
}

/**
 * Check if a line is a heading/title line
 */
function isHeadingLine(line) {
  const t = line.trim();
  // Roman numeral headings: I. II. III. IV. V. etc.
  if (/^(I{1,3}|IV|V|VI{0,3}|VII|VIII|IX|X{1,3})\.\s/.test(t)) return 'roman';
  // Numbered headings: 1. 2. 3. etc. (only if short or all caps)
  if (/^\d+\.\s/.test(t) && (t.length < 80 || t === t.toUpperCase())) return 'number';
  // Letter items: a) b) c) etc.
  if (/^[a-zđ]\)\s/.test(t)) return 'letter';
  // Bullet items
  if (/^[-–+•]\s/.test(t)) return 'bullet';
  return null;
}

/**
 * Smart paragraph parser: joins continuation lines into proper paragraphs
 * and detects structural elements (headings, lists, bullets).
 */
function parseContent(text) {
  if (!text) return [];

  const lines = text.split('\n');
  const blocks = [];
  let currentBlock = null;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();

    // Empty line = paragraph break
    if (trimmed === '') {
      if (currentBlock) {
        blocks.push(currentBlock);
        currentBlock = null;
      }
      continue;
    }

    const headingType = isHeadingLine(trimmed);

    if (headingType) {
      // Flush previous block
      if (currentBlock) {
        blocks.push(currentBlock);
        currentBlock = null;
      }
      blocks.push({ type: headingType, text: trimmed });
    } else {
      // Normal text line - join with previous if it's also normal text
      if (currentBlock && currentBlock.type === 'normal') {
        currentBlock.text += ' ' + trimmed;
      } else {
        if (currentBlock) {
          blocks.push(currentBlock);
        }
        currentBlock = { type: 'normal', text: trimmed };
      }
    }
  }

  if (currentBlock) {
    blocks.push(currentBlock);
  }

  // Convert blocks to docx paragraphs
  const paragraphs = [];

  for (const block of blocks) {
    switch (block.type) {
      case 'roman':
        // Roman numeral heading - bold, no indent, slight emphasis
        paragraphs.push(new Paragraph({
          children: [
            new TextRun({
              text: block.text,
              bold: true,
              font: FONT,
              size: FONT_SIZE,
            })
          ],
          spacing: {
            before: 120,
            after: PARA_SPACING_AFTER,
            line: LINE_SPACING,
            lineRule: LineRuleType.AUTO,
          },
          alignment: AlignmentType.JUSTIFIED,
          indent: { firstLine: FIRST_LINE_INDENT },
        }));
        break;

      case 'number':
        // Numbered sub-heading - bold, indented
        paragraphs.push(new Paragraph({
          children: [
            new TextRun({
              text: block.text,
              bold: true,
              font: FONT,
              size: FONT_SIZE,
            })
          ],
          spacing: {
            before: PARA_SPACING_BEFORE,
            after: PARA_SPACING_AFTER,
            line: LINE_SPACING,
            lineRule: LineRuleType.AUTO,
          },
          alignment: AlignmentType.JUSTIFIED,
          indent: { firstLine: FIRST_LINE_INDENT },
        }));
        break;

      case 'letter':
        // Letter item a) b) c) - normal weight, indented
        paragraphs.push(new Paragraph({
          children: [
            new TextRun({
              text: block.text,
              font: FONT,
              size: FONT_SIZE,
            })
          ],
          spacing: {
            before: PARA_SPACING_BEFORE,
            after: PARA_SPACING_AFTER,
            line: LINE_SPACING,
            lineRule: LineRuleType.AUTO,
          },
          alignment: AlignmentType.JUSTIFIED,
          indent: { firstLine: FIRST_LINE_INDENT },
        }));
        break;

      case 'bullet':
        // Bullet/dash items
        paragraphs.push(new Paragraph({
          children: [
            new TextRun({
              text: block.text,
              font: FONT,
              size: FONT_SIZE,
            })
          ],
          spacing: {
            before: PARA_SPACING_BEFORE,
            after: PARA_SPACING_AFTER,
            line: LINE_SPACING,
            lineRule: LineRuleType.AUTO,
          },
          alignment: AlignmentType.JUSTIFIED,
          indent: { firstLine: FIRST_LINE_INDENT },
        }));
        break;

      default:
        // Normal paragraph - justified, first-line indent
        paragraphs.push(new Paragraph({
          children: [
            new TextRun({
              text: block.text,
              font: FONT,
              size: FONT_SIZE,
            })
          ],
          spacing: {
            before: PARA_SPACING_BEFORE,
            after: PARA_SPACING_AFTER,
            line: LINE_SPACING,
            lineRule: LineRuleType.AUTO,
          },
          alignment: AlignmentType.JUSTIFIED,
          indent: { firstLine: FIRST_LINE_INDENT },
        }));
        break;
    }
  }

  return paragraphs;
}

/**
 * Parse "Nơi nhận" into paragraphs
 */
function parseNoiNhan(text) {
  if (!text) return [];
  const lines = text.split('\n').filter(l => l.trim());
  return lines.map(line => new Paragraph({
    children: [
      new TextRun({
        text: line.trim(),
        font: FONT,
        size: FONT_SIZE_11,
      })
    ],
    spacing: { after: 20 },
  }));
}

/**
 * Generate the DOCX document
 */
export async function generateDocument(data) {
  const {
    type,
    coQuanCapTren,
    tenDonVi,
    soVanBan,
    kyHieu,
    diaDanh,
    ngayThang,
    chucVu,
    thuTruong,
    trichYeu,
    kinhGui,
    noiDung,
    noiNhan
  } = data;

  const isKeHoach = type === 'kehoach';
  const loaiVanBan = isKeHoach ? 'KẾ HOẠCH' : '';
  const soKH = soVanBan ? `Số: ${soVanBan}/${kyHieu || (isKeHoach ? 'KH' : 'CV')}` : `Số:     /${kyHieu || (isKeHoach ? 'KH' : 'CV')}`;
  const dateStr = formatDateVN(ngayThang);
  const diaDanhDate = `${diaDanh || '.........'}, ${dateStr}`;

  // Build document sections
  const children = [];

  // === HEADER: Using a table for layout ===
  const headerTable = new Table({
    rows: [
      new TableRow({
        children: [
          // Left column: Cơ quan
          new TableCell({
            width: { size: 40, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.TOP,
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
            },
            children: [
              ...(coQuanCapTren ? [new Paragraph({
                children: [new TextRun({
                  text: coQuanCapTren.toUpperCase(),
                  font: FONT, size: FONT_SIZE_13,
                })],
                alignment: AlignmentType.CENTER,
              })] : []),
              new Paragraph({
                children: [new TextRun({
                  text: (tenDonVi || '').toUpperCase(),
                  bold: true,
                  font: FONT, size: FONT_SIZE_13,
                })],
                alignment: AlignmentType.CENTER,
              }),
              new Paragraph({
                children: [new TextRun({
                  text: '____________',
                  font: FONT, size: FONT_SIZE_13,
                })],
                alignment: AlignmentType.CENTER,
                spacing: { after: 60 },
              }),
              new Paragraph({
                children: [new TextRun({
                  text: soKH,
                  font: FONT, size: FONT_SIZE_13,
                })],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
          // Right column: Quốc hiệu
          new TableCell({
            width: { size: 60, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.TOP,
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
            },
            children: [
              new Paragraph({
                children: [new TextRun({
                  text: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
                  bold: true,
                  font: FONT, size: FONT_SIZE_13,
                })],
                alignment: AlignmentType.CENTER,
              }),
              new Paragraph({
                children: [new TextRun({
                  text: 'Độc lập - Tự do - Hạnh phúc',
                  bold: true,
                  font: FONT, size: FONT_SIZE_13,
                  underline: { type: UnderlineType.SINGLE },
                })],
                alignment: AlignmentType.CENTER,
                spacing: { after: 60 },
              }),
              new Paragraph({
                children: [new TextRun({
                  text: diaDanhDate,
                  italics: true,
                  font: FONT, size: FONT_SIZE_13,
                })],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
        ],
      }),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
  });

  children.push(headerTable);
  children.push(new Paragraph({ spacing: { before: 200 } }));

  // === DOCUMENT TYPE & TITLE ===
  if (isKeHoach) {
    children.push(new Paragraph({
      children: [new TextRun({
        text: loaiVanBan,
        bold: true,
        font: FONT, size: FONT_SIZE,
      })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 120 },
    }));
    if (trichYeu) {
      children.push(new Paragraph({
        children: [new TextRun({
          text: trichYeu,
          bold: true,
          font: FONT, size: FONT_SIZE,
        })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 60 },
      }));
      children.push(new Paragraph({
        children: [new TextRun({
          text: '____________',
          font: FONT, size: FONT_SIZE,
        })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      }));
    }
  } else {
    if (trichYeu) {
      children.push(new Paragraph({
        children: [new TextRun({
          text: `V/v ${trichYeu}`,
          italics: true,
          font: FONT, size: FONT_SIZE_13,
        })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
      }));
    }
    if (kinhGui) {
      children.push(new Paragraph({
        children: [
          new TextRun({
            text: 'Kính gửi: ',
            bold: true,
            font: FONT, size: FONT_SIZE,
          }),
          new TextRun({
            text: kinhGui,
            font: FONT, size: FONT_SIZE,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      }));
    }
  }

  // === CONTENT ===
  const contentParagraphs = parseContent(noiDung);
  children.push(...contentParagraphs);

  // === FOOTER: Nơi nhận + Chữ ký ===
  children.push(new Paragraph({ spacing: { before: 200 } }));

  const footerTable = new Table({
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 45, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.TOP,
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
            },
            children: [
              new Paragraph({
                children: [new TextRun({
                  text: 'Nơi nhận:',
                  bold: true, italics: true,
                  font: FONT, size: FONT_SIZE_11,
                })],
              }),
              ...parseNoiNhan(noiNhan),
            ],
          }),
          new TableCell({
            width: { size: 55, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.TOP,
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
            },
            children: [
              new Paragraph({
                children: [new TextRun({
                  text: (chucVu || 'THỦ TRƯỞNG ĐƠN VỊ').toUpperCase(),
                  bold: true,
                  font: FONT, size: FONT_SIZE,
                })],
                alignment: AlignmentType.CENTER,
              }),
              new Paragraph({ spacing: { before: 200 } }),
              new Paragraph({ spacing: { before: 200 } }),
              new Paragraph({
                children: [new TextRun({
                  text: thuTruong || '',
                  bold: true,
                  font: FONT, size: FONT_SIZE,
                })],
                alignment: AlignmentType.CENTER,
                spacing: { before: 200 },
              }),
            ],
          }),
        ],
      }),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
  });

  children.push(footerTable);

  // Create the document with proper default font
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: FONT,
            size: FONT_SIZE,
          },
          paragraph: {
            spacing: {
              line: LINE_SPACING,
              lineRule: LineRuleType.AUTO,
            },
            alignment: AlignmentType.JUSTIFIED,
          },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertMillimetersToTwip(20),    // 2cm
            right: convertMillimetersToTwip(20),   // 2cm
            bottom: convertMillimetersToTwip(20),  // 2cm
            left: convertMillimetersToTwip(30),    // 3cm
          },
          size: {
            width: convertMillimetersToTwip(210),  // A4
            height: convertMillimetersToTwip(297),
          },
        },
      },
      children,
    }],
  });

  // Generate and save
  const blob = await Packer.toBlob(doc);
  const fileName = isKeHoach
    ? `Ke_hoach_${(tenDonVi || 'vanban').replace(/\s+/g, '_')}.docx`
    : `Cong_van_${(tenDonVi || 'vanban').replace(/\s+/g, '_')}.docx`;
  saveAs(blob, fileName);
  return fileName;
}
