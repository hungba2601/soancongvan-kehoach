import './style.css';
import { readUploadedFile } from './file-reader.js';
import { generateDocument } from './document-generator.js';
import { generateDocumentContent } from './gemini-service.js';

// ===== STATE =====
const state = {
  docType: 'kehoach', // Default
  uploadedFile: null,
  fileContent: '',
  currentStep: 1,
  apiKey: localStorage.getItem('gemini-api-key') || '',
};

// ===== DOM ELEMENTS =====
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// Steps
const steps = [$('#step-1'), $('#step-2'), $('#step-3')];
const stepItems = $$('.step-item');
const btnNextStep1 = $('#btn-next-step1');
const btnBackStep2 = $('#btn-back-step2');
const btnGenerateAI = $('#btn-generate-ai');
const btnBackStep3 = $('#btn-back-step3');

// API Key Modal
const modalApiKey = $('#modal-api-key');
const btnApiKey = $('#btn-api-key');
const modalApiClose = $('#modal-api-close');
const modalApiCancel = $('#modal-api-cancel');
const modalApiSave = $('#modal-api-save');
const inputApiKey = $('#input-api-key');

// Inputs Step 1
const inputDocType = $('#input-docType');
const inputCoQuanCapTren = $('#input-coquan-capTren');
const inputTenDonVi = $('#input-tenDonVi');
const inputSoVanBan = $('#input-soVanBan');
const inputKyHieu = $('#input-kyHieu');
const inputDiaDanh = $('#input-diaDanh');
const inputNgayThang = $('#input-ngayThang');
const inputChucVu = $('#input-chucVu');
const inputThuTruong = $('#input-thuTruong');
const inputNoiNhan = $('#input-noiNhan');
const btnFillNoiNhan = $('#btn-fill-noiNhan');
const congvanFields = $('#congvan-fields');

// Inputs Step 2
const inputTrichYeu = $('#input-trichYeu');
const inputKinhGui = $('#input-kinhGui');
const uploadZone = $('#upload-zone');
const fileInput = $('#file-input');
const fileInfo = $('#file-info');
const fileName = $('#file-name');
const btnRemoveFile = $('#btn-remove-file');
const inputYeuCauAI = $('#input-yeuCauAI');

// Inputs Step 3
const inputNoiDung = $('#input-noiDung');
const btnFillNoiDung = $('#btn-fill-noiDung');
const btnCopy = $('#btn-copy');
const btnExport = $('#btn-export');

// Preview
const previewDoc = $('#preview-doc');
const btnRefreshPreview = $('#btn-refresh-preview');

// Theme
const btnThemeToggle = $('#btn-theme-toggle');
const themeIconSun = $('#theme-icon-sun');
const themeIconMoon = $('#theme-icon-moon');

// ===== UTILITIES =====
function showToast(message, type = 'info') {
  const container = $('#toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(40px)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function setDefaultDate() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  inputNgayThang.value = `${yyyy}-${mm}-${dd}`;
}

// ===== WIZARD NAVIGATION =====
function goToStep(step) {
  state.currentStep = step;
  
  // Update UI Panels
  steps.forEach((s, index) => {
    if (index + 1 === step) {
      s.classList.add('active');
    } else {
      s.classList.remove('active');
    }
  });

  // Update Indicator
  stepItems.forEach((item) => {
    const s = parseInt(item.dataset.step);
    if (s === step) {
      item.classList.add('active');
      item.classList.remove('completed');
    } else if (s < step) {
      item.classList.remove('active');
      item.classList.add('completed');
    } else {
      item.classList.remove('active');
      item.classList.remove('completed');
    }
  });

  updatePreview();
}

btnNextStep1.addEventListener('click', () => {
  if (!inputTenDonVi.value.trim()) {
    showToast('Vui lòng nhập Tên đơn vị ban hành', 'error');
    inputTenDonVi.focus();
    return;
  }
  goToStep(2);
});

btnBackStep2.addEventListener('click', () => goToStep(1));
btnBackStep3.addEventListener('click', () => goToStep(2));

// ===== STEP 1 LOGIC =====
const docTypeNames = {
  congvan: 'Công văn',
  kehoach: 'Kế hoạch',
  thongbao: 'Thông báo',
  quyetdinh: 'Quyết định',
  totrinh: 'Tờ trình',
  baocao: 'Báo cáo',
  bienban: 'Biên bản'
};

inputDocType.addEventListener('change', (e) => {
  state.docType = e.target.value;
  
  // Set default Ky Hieu placeholder
  const prefix = state.docType.substring(0, 2).toUpperCase();
  inputKyHieu.placeholder = `VD: ${prefix}-SGDĐT`;
  
  // Kính gửi thường dùng cho công văn, tờ trình, báo cáo
  const hasKinhGui = ['congvan', 'totrinh', 'baocao'].includes(state.docType);
  congvanFields.classList.toggle('hidden', !hasKinhGui);
  
  updatePreview();
});

const noiNhanTemplates = {
  kehoach: `- Như trên;\n- UBND tỉnh (để b/c);\n- Các phòng, ban liên quan;\n- Lưu: VT, VP.`,
  congvan: `- Như trên;\n- Ban Giám đốc (để b/c);\n- Các phòng chuyên môn;\n- Lưu: VT, VP.`
};

btnFillNoiNhan.addEventListener('click', () => {
  inputNoiNhan.value = noiNhanTemplates[state.docType];
  updatePreview();
});

// ===== STEP 2 LOGIC (UPLOAD & AI) =====
uploadZone.addEventListener('click', () => fileInput.click());
uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.style.borderColor = 'var(--accent)'; });
uploadZone.addEventListener('dragleave', () => { uploadZone.style.borderColor = 'var(--border)'; });
uploadZone.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadZone.style.borderColor = 'var(--border)';
  if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', (e) => {
  if (e.target.files.length > 0) handleFile(e.target.files[0]);
});

async function handleFile(file) {
  state.uploadedFile = file;
  fileName.textContent = file.name;
  uploadZone.classList.add('hidden');
  fileInfo.classList.remove('hidden');

  try {
    showToast('Đang đọc file tham khảo...', 'info');
    const content = await readUploadedFile(file);
    state.fileContent = content;
    showToast('Đã đọc file thành công!', 'success');
  } catch (err) {
    showToast('Lỗi: ' + err.message, 'error');
    removeFile();
  }
}

function removeFile() {
  state.uploadedFile = null;
  state.fileContent = '';
  fileInput.value = '';
  uploadZone.classList.remove('hidden');
  fileInfo.classList.add('hidden');
}
btnRemoveFile.addEventListener('click', removeFile);

// AI GENERATION
btnGenerateAI.addEventListener('click', async () => {
  if (!state.apiKey) {
    showToast('Vui lòng Cấu hình API Key để sử dụng AI', 'error');
    modalApiKey.classList.remove('hidden');
    return;
  }
  
  const trichYeu = inputTrichYeu.value.trim();
  if (!trichYeu) {
    showToast('Vui lòng nhập Trích yếu nội dung', 'error');
    inputTrichYeu.focus();
    return;
  }

  const yeuCau = inputYeuCauAI.value.trim();
  const model = 'gemini-2.5-flash';
  const docTypeName = docTypeNames[state.docType];

  try {
    btnGenerateAI.disabled = true;
    btnGenerateAI.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg> Đang sinh nội dung...`;
    
    const text = await generateDocumentContent(state.apiKey, model, {
      trichYeu, yeuCau, refContent: state.fileContent, docTypeName
    });

    inputNoiDung.value = text;
    showToast('Đã tạo nội dung thành công!', 'success');
    goToStep(3);
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btnGenerateAI.disabled = false;
    btnGenerateAI.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg> Tạo nội dung AI`;
  }
});

// ===== STEP 3 LOGIC (EDITOR & EXPORT) =====
const noiDungTemplates = {
  kehoach: `I. MỤC ĐÍCH, YÊU CẦU\n1. Mục đích\n- Nhằm triển khai...\n2. Yêu cầu\n- Đảm bảo thiết thực...\n\nII. NỘI DUNG\n1. Công tác tuyên truyền\n2. Tổ chức thực hiện\n\nIII. TỔ CHỨC THỰC HIỆN\n1. Giao bộ phận...`,
  congvan: `Thực hiện chỉ đạo của..., đơn vị yêu cầu các bộ phận thực hiện một số nội dung sau:\n\n1. Nghiên cứu kỹ nội dung...\n\n2. Báo cáo tình hình...\n\nTrong quá trình thực hiện, nếu có vướng mắc báo cáo kịp thời./.`
};

btnFillNoiDung.addEventListener('click', () => {
  if (inputNoiDung.value.trim() && !confirm('Thay thế nội dung hiện tại bằng Form mẫu?')) return;
  inputNoiDung.value = noiDungTemplates[state.docType];
  updatePreview();
});

btnCopy.addEventListener('click', () => {
  navigator.clipboard.writeText(inputNoiDung.value);
  showToast('Đã copy nội dung vào Clipboard!', 'success');
});

btnExport.addEventListener('click', async () => {
  if (!inputTenDonVi.value.trim()) return showToast('Thiếu tên đơn vị', 'error');
  if (!inputNoiDung.value.trim()) return showToast('Nội dung đang trống', 'error');

  try {
    btnExport.disabled = true;
    const data = {
      type: state.docType,
      coQuanCapTren: inputCoQuanCapTren.value.trim(),
      tenDonVi: inputTenDonVi.value.trim(),
      soVanBan: inputSoVanBan.value.trim(),
      kyHieu: inputKyHieu.value.trim(),
      diaDanh: inputDiaDanh.value.trim(),
      ngayThang: inputNgayThang.value,
      chucVu: inputChucVu.value.trim(),
      thuTruong: inputThuTruong.value.trim(),
      trichYeu: inputTrichYeu.value.trim(),
      kinhGui: inputKinhGui.value.trim(),
      noiDung: inputNoiDung.value.trim(),
      noiNhan: inputNoiNhan.value.trim(),
    };
    const savedFileName = await generateDocument(data);
    showToast(`Đã xuất file: ${savedFileName}`, 'success');
  } catch (err) {
    showToast('Lỗi xuất file: ' + err.message, 'error');
  } finally {
    btnExport.disabled = false;
  }
});

// ===== PREVIEW LOGIC =====
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDateVNPreview(dateStr) {
  if (!dateStr) {
    const now = new Date();
    return `ngày ${now.getDate()} tháng ${now.getMonth() + 1} năm ${now.getFullYear()}`;
  }
  const d = new Date(dateStr);
  return `ngày ${d.getDate()} tháng ${d.getMonth() + 1} năm ${d.getFullYear()}`;
}

function renderContentPreview(text) {
  if (!text || !text.trim()) {
    return '<div class="doc-noiDung"><p style="color:#999;font-style:italic">Nội dung văn bản...</p></div>';
  }

  const lines = text.split('\n');
  const blocks = [];
  let currentBlock = null;

  function isHeading(line) {
    const t = line.trim();
    if (/^(I{1,3}|IV|V|VI{0,3}|VII|VIII|IX|X{1,3})\.\s/.test(t)) return 'roman';
    if (/^\d+\.\s/.test(t) && (t.length < 80 || t === t.toUpperCase())) return 'number';
    if (/^[a-zđ]\)\s/.test(t)) return 'letter';
    if (/^[-–+•]\s/.test(t)) return 'bullet';
    return null;
  }

  for (const raw of lines) {
    const trimmed = raw.trim();
    if (trimmed === '') {
      if (currentBlock) { blocks.push(currentBlock); currentBlock = null; }
      continue;
    }
    const hType = isHeading(trimmed);
    if (hType) {
      if (currentBlock) { blocks.push(currentBlock); currentBlock = null; }
      blocks.push({ type: hType, text: trimmed });
    } else {
      if (currentBlock && currentBlock.type === 'normal') {
        currentBlock.text += ' ' + trimmed;
      } else {
        if (currentBlock) blocks.push(currentBlock);
        currentBlock = { type: 'normal', text: trimmed };
      }
    }
  }
  if (currentBlock) blocks.push(currentBlock);

  let html = '<div class="doc-noiDung">';
  for (const block of blocks) {
    const escaped = escapeHtml(block.text);
    if (block.type === 'roman' || block.type === 'number') {
      html += `<p style="font-weight:bold;text-indent:1.27cm;margin:3pt 0;text-align:justify">${escaped}</p>`;
    } else if (block.type === 'bullet' || block.type === 'letter') {
      html += `<p style="text-indent:1.27cm;margin:2pt 0;text-align:justify">${escaped}</p>`;
    } else {
      html += `<p style="text-indent:1.27cm;margin:3pt 0;text-align:justify">${escaped}</p>`;
    }
  }
  html += '</div>';
  return html;
}

function updatePreview() {
  const isCongVan = state.docType === 'congvan';
  const docTypeName = docTypeNames[state.docType];
  
  const coQuan = inputCoQuanCapTren.value.trim();
  const donVi = inputTenDonVi.value.trim();
  const soVB = inputSoVanBan.value.trim();
  
  const prefix = state.docType.substring(0, 2).toUpperCase();
  const kyHieu = inputKyHieu.value.trim() || prefix;
  
  const diaDanh = inputDiaDanh.value.trim();
  const ngayThang = inputNgayThang.value;
  const chucVu = inputChucVu.value.trim();
  const thuTruong = inputThuTruong.value.trim();
  const trichYeu = inputTrichYeu.value.trim();
  const kinhGui = inputKinhGui.value.trim();
  const noiDung = inputNoiDung.value.trim();
  const noiNhan = inputNoiNhan.value.trim();

  const dateStr = formatDateVNPreview(ngayThang);
  const soKHStr = soVB ? `Số: ${soVB}/${kyHieu}` : `Số:     /${kyHieu}`;

  let html = `
    <div class="doc-header">
      <div class="doc-left">
        ${coQuan ? `<div class="doc-coquan">${escapeHtml(coQuan)}</div>` : ''}
        <div class="doc-donvi">${escapeHtml(donVi || '...............')}</div>
        <div class="doc-line"></div>
        <div class="doc-soKyHieu">${escapeHtml(soKHStr)}</div>
      </div>
      <div class="doc-right">
        <div class="doc-quochieu">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
        <div class="doc-tieungu">Độc lập - Tự do - Hạnh phúc</div>
        <div class="doc-line-long"></div>
        <div class="doc-diaDanhNgay">${escapeHtml(diaDanh || '.........')}, ${dateStr}</div>
      </div>
    </div>
  `;

  if (!isCongVan) {
    html += `
      <div class="doc-tenLoai">${docTypeName.toUpperCase()}</div>
      ${trichYeu ? `<div class="doc-trichYeu">${escapeHtml(trichYeu)}</div>` : ''}
    `;
    // Thêm kính gửi nếu có nhập (cho tờ trình, báo cáo)
    if (kinhGui) {
      html += `<div class="doc-kinhGui">Kính gửi: ${escapeHtml(kinhGui)}</div>`;
    }
  } else {
    html += trichYeu ? `<div class="doc-trichYeu-cv">V/v ${escapeHtml(trichYeu)}</div>` : '';
    html += kinhGui ? `<div class="doc-kinhGui">Kính gửi: ${escapeHtml(kinhGui)}</div>` : '';
  }

  html += renderContentPreview(noiDung);

  html += `
    <div class="doc-footer">
      <div class="doc-noiNhan">
        <strong><em>Nơi nhận:</em></strong><br>
        ${noiNhan ? escapeHtml(noiNhan).replace(/\n/g, '<br>') : '- Như trên;<br>- Lưu: VT.'}
      </div>
      <div class="doc-kyTen">
        <div class="doc-chucVu">${escapeHtml(chucVu || 'THỦ TRƯỞNG ĐƠN VỊ')}</div>
        <div class="doc-tenNguoiKy">${escapeHtml(thuTruong || '...............')}</div>
      </div>
    </div>
  `;

  previewDoc.innerHTML = html;
}

// Auto update preview on all inputs
const allInputs = [
  inputCoQuanCapTren, inputTenDonVi, inputSoVanBan, inputKyHieu, inputDiaDanh, inputNgayThang,
  inputChucVu, inputThuTruong, inputTrichYeu, inputKinhGui, inputNoiDung, inputNoiNhan
];
allInputs.forEach(i => i.addEventListener('input', () => updatePreview()));
btnRefreshPreview.addEventListener('click', updatePreview);


// ===== API KEY MODAL =====
btnApiKey.addEventListener('click', () => {
  inputApiKey.value = state.apiKey;
  modalApiKey.classList.remove('hidden');
});

function closeApiModal() { modalApiKey.classList.add('hidden'); }
modalApiClose.addEventListener('click', closeApiModal);
modalApiCancel.addEventListener('click', closeApiModal);

modalApiSave.addEventListener('click', () => {
  const key = inputApiKey.value.trim();
  if (key) {
    localStorage.setItem('gemini-api-key', key);
    state.apiKey = key;
    showToast('Đã lưu cấu hình API Key', 'success');
    closeApiModal();
  } else {
    showToast('Vui lòng nhập API Key hợp lệ', 'error');
  }
});


// ===== THEME TOGGLE =====
function initTheme() {
  const savedTheme = localStorage.getItem('app-theme') || 'light';
  setTheme(savedTheme);
}

function setTheme(theme) {
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    themeIconSun.classList.remove('hidden');
    themeIconMoon.classList.add('hidden');
    localStorage.setItem('app-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
    themeIconSun.classList.add('hidden');
    themeIconMoon.classList.remove('hidden');
    localStorage.setItem('app-theme', 'light');
  }
}

btnThemeToggle.addEventListener('click', () => {
  const currentTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  setTheme(currentTheme === 'dark' ? 'light' : 'dark');
});

// ===== INIT =====
setDefaultDate();
initTheme();
goToStep(1); // Start at step 1
