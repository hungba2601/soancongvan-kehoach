import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

/**
 * Read uploaded file and extract text content
 * Supports: .docx, .doc, .txt, .pdf
 */
export async function readUploadedFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();

  if (ext === 'txt') {
    return await readTextFile(file);
  }

  if (ext === 'docx' || ext === 'doc') {
    return await readDocxFile(file);
  }

  if (ext === 'pdf') {
    return await readPdfFile(file);
  }

  throw new Error(`Định dạng file .${ext} không được hỗ trợ`);
}

async function readTextFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error('Không thể đọc file'));
    reader.readAsText(file, 'UTF-8');
  });
}

async function readDocxFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const result = await mammoth.extractRawText({
          arrayBuffer: e.target.result
        });
        resolve(result.value);
      } catch (err) {
        reject(new Error('Không thể đọc file DOCX: ' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('Không thể đọc file'));
    reader.readAsArrayBuffer(file);
  });
}

async function readPdfFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const typedArray = new Uint8Array(e.target.result);
        const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
        const totalPages = pdf.numPages;
        const textParts = [];

        for (let i = 1; i <= totalPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map(item => item.str)
            .join(' ')
            .replace(/\s{2,}/g, ' ');
          textParts.push(pageText);
        }

        const fullText = textParts.join('\n\n');
        if (!fullText.trim()) {
          resolve('(File PDF không chứa text có thể trích xuất. File có thể là ảnh scan.)');
        } else {
          resolve(fullText);
        }
      } catch (err) {
        reject(new Error('Không thể đọc file PDF: ' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('Không thể đọc file'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Format file size to human readable string
 */
export function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
