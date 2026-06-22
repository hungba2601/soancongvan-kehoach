import './style.css';
import { readUploadedFile, formatFileSize } from './file-reader.js';
import { generateDocument } from './document-generator.js';

// ===== STATE =====
const state = {
  docType: null, // 'kehoach' or 'congvan'
  uploadedFile: null,
  fileContent: '',
};

// ===== DOM ELEMENTS =====
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// Steps
const stepType = $('#step-type');
const stepInfo = $('#step-info');
const stepEditor = $('#step-editor');

// Type cards
const cardKeHoach = $('#card-kehoach');
const cardCongVan = $('#card-congvan');

// Upload
const uploadZone = $('#upload-zone');
const fileInput = $('#file-input');
const fileInfo = $('#file-info');
const fileName = $('#file-name');
const fileSize = $('#file-size');
const btnRemoveFile = $('#btn-remove-file');
const fileContentPreview = $('#file-content-preview');
const refContent = $('#ref-content');

// Navigation
const btnBackType = $('#btn-back-type');
const btnNextContent = $('#btn-next-content');
const btnBackInfo = $('#btn-back-info');
const btnNewDoc = $('#btn-new-doc');

// Editor
const btnUseRef = $('#btn-use-ref');
const btnSelectRef = $('#btn-select-ref');
const btnFillNoiDung = $('#btn-fill-noiDung');
const btnRefreshPreview = $('#btn-refresh-preview');
const btnExport = $('#btn-export');
const congvanFields = $('#congvan-fields');
const previewDoc = $('#preview-doc');

// Modal Elements
const modalSelectContent = $('#modal-select-content');
const modalBtnClose = $('#modal-btn-close');
const modalBtnCancel = $('#modal-btn-cancel');
const modalBtnApply = $('#modal-btn-apply');
const modalBtnSelectAll = $('#modal-btn-select-all');
const modalBtnDeselectAll = $('#modal-btn-deselect-all');
const modalParagraphsList = $('#modal-paragraphs-list');

// Form inputs
const inputCoQuanCapTren = $('#input-coquan-capTren');
const inputTenDonVi = $('#input-tenDonVi');
const inputSoVanBan = $('#input-soVanBan');
const inputKyHieu = $('#input-kyHieu');
const inputDiaDanh = $('#input-diaDanh');
const inputNgayThang = $('#input-ngayThang');
const inputChucVu = $('#input-chucVu');
const inputThuTruong = $('#input-thuTruong');
const inputTrichYeu = $('#input-trichYeu');
const inputKinhGui = $('#input-kinhGui');
const inputNoiDung = $('#input-noiDung');
const inputNoiNhan = $('#input-noiNhan');

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
    toast.style.transition = '0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function switchStep(activeStep) {
  [stepType, stepInfo, stepEditor].forEach(s => s.classList.remove('active'));
  activeStep.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setDefaultDate() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  inputNgayThang.value = `${yyyy}-${mm}-${dd}`;
}

// ===== STEP 1: TYPE SELECTION =====
function selectType(type) {
  state.docType = type;
  cardKeHoach.classList.toggle('selected', type === 'kehoach');
  cardCongVan.classList.toggle('selected', type === 'congvan');

  // Update titles
  const typeName = type === 'kehoach' ? 'Kế Hoạch' : 'Công Văn';
  $('#step2-title').textContent = `Thông tin ${typeName}`;
  $('#step3-title').textContent = `Soạn nội dung ${typeName}`;

  // Update ký hiệu placeholder
  inputKyHieu.placeholder = type === 'kehoach' ? 'VD: KH-SGDĐT' : 'VD: CV-SGDĐT';

  // Show/hide Công văn specific fields
  congvanFields.classList.toggle('hidden', type !== 'congvan');

  // Update placeholder for nội dung
  if (type === 'kehoach') {
    inputNoiDung.placeholder = 'Nhập nội dung kế hoạch tại đây...\n\nGợi ý cấu trúc:\nI. MỤC ĐÍCH, YÊU CẦU\n1. Mục đích\n2. Yêu cầu\n\nII. NỘI DUNG\n\nIII. TỔ CHỨC THỰC HIỆN';
  } else {
    inputNoiDung.placeholder = 'Nhập nội dung công văn tại đây...\n\nVD: Thực hiện chỉ đạo của..., Sở Giáo dục và Đào tạo đề nghị các đơn vị...';
  }

  setTimeout(() => switchStep(stepInfo), 200);
}

cardKeHoach.addEventListener('click', () => selectType('kehoach'));
cardCongVan.addEventListener('click', () => selectType('congvan'));

// ===== STEP 2: UPLOAD & INFO =====
// Upload zone handlers
uploadZone.addEventListener('click', () => fileInput.click());

uploadZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadZone.classList.add('dragover');
});

uploadZone.addEventListener('dragleave', () => {
  uploadZone.classList.remove('dragover');
});

uploadZone.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadZone.classList.remove('dragover');
  const files = e.dataTransfer.files;
  if (files.length > 0) handleFile(files[0]);
});

fileInput.addEventListener('change', (e) => {
  if (e.target.files.length > 0) handleFile(e.target.files[0]);
});

async function handleFile(file) {
  state.uploadedFile = file;
  fileName.textContent = file.name;
  fileSize.textContent = formatFileSize(file.size);
  uploadZone.classList.add('hidden');
  fileInfo.classList.remove('hidden');

  try {
    showToast('Đang đọc file...', 'info');
    const content = await readUploadedFile(file);
    state.fileContent = content;
    refContent.textContent = content.substring(0, 2000) + (content.length > 2000 ? '\n\n... (nội dung đã được rút gọn)' : '');
    fileContentPreview.classList.remove('hidden');
    showToast('Đã đọc file thành công!', 'success');
  } catch (err) {
    showToast('Lỗi: ' + err.message, 'error');
    state.fileContent = '';
  }
}

btnRemoveFile.addEventListener('click', () => {
  state.uploadedFile = null;
  state.fileContent = '';
  fileInput.value = '';
  uploadZone.classList.remove('hidden');
  fileInfo.classList.add('hidden');
  fileContentPreview.classList.add('hidden');
});

// Navigation
btnBackType.addEventListener('click', () => switchStep(stepType));

btnNextContent.addEventListener('click', () => {
  if (!inputTenDonVi.value.trim()) {
    showToast('Vui lòng nhập tên đơn vị ban hành', 'error');
    inputTenDonVi.focus();
    return;
  }
  switchStep(stepEditor);
  updatePreview();
});

btnBackInfo.addEventListener('click', () => switchStep(stepInfo));

btnNewDoc.addEventListener('click', () => {
  if (confirm('Bạn có chắc muốn tạo văn bản mới? Dữ liệu hiện tại sẽ bị xóa.')) {
    resetAll();
  }
});

// ===== STEP 3: EDITOR =====
// Fill template for "Nơi nhận"
const btnFillNoiNhan = $('#btn-fill-noiNhan');

const noiNhanTemplates = {
  kehoach: `- Như trên;
- UBND tỉnh (để b/c);
- Các phòng, ban liên quan;
- Lưu: VT, VP.`,
  congvan: `- Như trên;
- Ban Giám đốc (để b/c);
- Các phòng chuyên môn;
- Lưu: VT, VP.`
};

btnFillNoiNhan.addEventListener('click', () => {
  const template = noiNhanTemplates[state.docType] || noiNhanTemplates.congvan;
  if (inputNoiNhan.value.trim() && !confirm('Nội dung nơi nhận hiện tại sẽ được thay thế bằng mẫu. Tiếp tục?')) return;
  inputNoiNhan.value = template;
  inputNoiNhan.focus();
  showToast('Đã điền mẫu nơi nhận. Bạn có thể chỉnh sửa lại.', 'success');
  updatePreview();
});

// Fill template for "Nội dung chính"
const noiDungTemplates = {
  kehoach: `I. MỤC ĐÍCH, YÊU CẦU
1. Mục đích
- Nhằm triển khai thực hiện có hiệu quả các nội dung đề ra.
- Tăng cường trách nhiệm của các cơ quan, đơn vị có liên quan.
2. Yêu cầu
- Việc thực hiện phải đảm bảo thiết thực, tiết kiệm, tránh hình thức.
- Có sự phối hợp chặt chẽ, đồng bộ giữa các đơn vị liên quan.

II. NỘI DUNG VÀ BIỆN PHÁP THỰC HIỆN
1. Công tác tuyên truyền, phổ biến quán triệt các văn bản chỉ đạo.
2. Tổ chức triển khai thực hiện các nhiệm vụ chuyên môn theo đúng tiến độ.
3. Tăng cường kiểm tra, đánh giá kết quả thực hiện.

III. TỔ CHỨC THỰC HIỆN
1. Trưởng các bộ phận thuộc đơn vị có trách nhiệm phổ biến và triển khai thực hiện kế hoạch này.
2. Giao văn phòng đơn vị tổng hợp kết quả, báo cáo lãnh đạo theo quy định.`,

  congvan: `Thực hiện chỉ đạo của cấp trên về việc triển khai nhiệm vụ chuyên môn, đơn vị yêu cầu các bộ phận trực thuộc thực hiện một số nội dung sau:

1. Nghiên cứu kỹ nội dung hướng dẫn của cơ quan cấp trên và phổ biến quán triệt sâu rộng đến toàn thể cán bộ, công chức, viên chức.

2. Xây dựng kế hoạch chi tiết để cụ thể hóa các mục tiêu, nhiệm vụ được giao, đảm bảo đúng tiến độ và đạt hiệu quả cao nhất.

3. Báo cáo tình hình và kết quả thực hiện gửi về Văn phòng tổng hợp trước ngày quy định để báo cáo cấp trên.

Trong quá trình thực hiện, nếu có khó khăn, vướng mắc phát sinh, các đơn vị kịp thời phản ánh về Văn phòng để tổng hợp, báo cáo Ban Lãnh đạo xem xét giải quyết./.`
};

btnFillNoiDung.addEventListener('click', () => {
  const template = noiDungTemplates[state.docType] || noiDungTemplates.congvan;
  if (inputNoiDung.value.trim() && !confirm('Nội dung chính hiện tại sẽ được thay thế bằng mẫu chuẩn. Tiếp tục?')) return;
  inputNoiDung.value = template;
  inputNoiDung.focus();
  showToast('Đã điền mẫu nội dung chính. Bạn có thể chỉnh sửa lại.', 'success');
  updatePreview();
});

btnUseRef.addEventListener('click', () => {
  if (!state.fileContent) {
    showToast('Chưa có file tham khảo nào được upload', 'error');
    return;
  }
  if (inputNoiDung.value.trim() && !confirm('Nội dung hiện tại sẽ được thay thế bằng toàn bộ nội dung file tham khảo. Tiếp tục?')) return;
  inputNoiDung.value = state.fileContent;
  showToast('Đã sử dụng toàn bộ nội dung từ file tham khảo', 'success');
  updatePreview();
});

// Selective Import Modal Logic
let paragraphsToSelect = [];

btnSelectRef.addEventListener('click', () => {
  if (!state.fileContent) {
    showToast('Vui lòng upload file tham khảo trước ở Bước 2!', 'error');
    return;
  }
  
  // Split content into paragraphs
  paragraphsToSelect = state.fileContent.split('\n')
    .map(p => p.trim())
    .filter(p => p.length > 0);

  if (paragraphsToSelect.length === 0) {
    showToast('File tham khảo không có nội dung văn bản để trích xuất', 'error');
    return;
  }

  // Populate list
  modalParagraphsList.innerHTML = '';
  paragraphsToSelect.forEach((text, index) => {
    const item = document.createElement('div');
    item.className = 'paragraph-item selected'; // Selected by default
    item.dataset.index = index;
    item.innerHTML = `
      <input type="checkbox" id="para-chk-${index}" checked />
      <label class="paragraph-text" for="para-chk-${index}">${escapeHtml(text)}</label>
    `;
    
    // Toggle check on container click (but avoid double toggle if clicking checkbox/label itself)
    item.addEventListener('click', (e) => {
      if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'LABEL') {
        const chk = item.querySelector('input');
        chk.checked = !chk.checked;
        item.classList.toggle('selected', chk.checked);
      }
    });
    
    // Toggle class on input change
    item.querySelector('input').addEventListener('change', (e) => {
      item.classList.toggle('selected', e.target.checked);
    });

    modalParagraphsList.appendChild(item);
  });

  // Open modal
  modalSelectContent.classList.remove('hidden');
});

// Close modal handlers
function closeModal() {
  modalSelectContent.classList.add('hidden');
}

modalBtnClose.addEventListener('click', closeModal);
modalBtnCancel.addEventListener('click', closeModal);
modalSelectContent.addEventListener('click', (e) => {
  if (e.target === modalSelectContent) closeModal();
});

// Select All / Deselect All
modalBtnSelectAll.addEventListener('click', () => {
  $$('.paragraph-item').forEach(item => {
    item.classList.add('selected');
    item.querySelector('input').checked = true;
  });
});

modalBtnDeselectAll.addEventListener('click', () => {
  $$('.paragraph-item').forEach(item => {
    item.classList.remove('selected');
    item.querySelector('input').checked = false;
  });
});

// Apply selected content
modalBtnApply.addEventListener('click', () => {
  const selectedTexts = [];
  $$('.paragraph-item').forEach(item => {
    const chk = item.querySelector('input');
    if (chk.checked) {
      const idx = parseInt(item.dataset.index);
      selectedTexts.push(paragraphsToSelect[idx]);
    }
  });

  if (selectedTexts.length === 0) {
    showToast('Vui lòng chọn ít nhất một đoạn nội dung!', 'error');
    return;
  }

  if (inputNoiDung.value.trim() && !confirm('Nội dung chính hiện tại sẽ được thay thế bằng các phần đã chọn. Tiếp tục?')) return;

  inputNoiDung.value = selectedTexts.join('\n\n');
  showToast(`Đã trích xuất ${selectedTexts.length} đoạn nội dung!`, 'success');
  closeModal();
  updatePreview();
});

// Auto-update preview on input change
const previewInputs = [
  inputCoQuanCapTren, inputTenDonVi, inputSoVanBan, inputKyHieu,
  inputDiaDanh, inputNgayThang, inputChucVu, inputThuTruong,
  inputTrichYeu, inputKinhGui, inputNoiDung, inputNoiNhan
];

let previewTimeout;
previewInputs.forEach(input => {
  input.addEventListener('input', () => {
    clearTimeout(previewTimeout);
    previewTimeout = setTimeout(updatePreview, 400);
  });
});

btnRefreshPreview.addEventListener('click', updatePreview);

// ===== PREVIEW =====
function formatDateVNPreview(dateStr) {
  if (!dateStr) {
    const now = new Date();
    return `ngày ${now.getDate()} tháng ${now.getMonth() + 1} năm ${now.getFullYear()}`;
  }
  const d = new Date(dateStr);
  return `ngày ${d.getDate()} tháng ${d.getMonth() + 1} năm ${d.getFullYear()}`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Smart content renderer for preview - joins continuation lines into paragraphs
 */
function renderContentPreview(text) {
  if (!text || !text.trim()) {
    return '<div class="doc-noiDung"><p style="color:#999;font-style:italic">Nhập nội dung...</p></div>';
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
  const isKH = state.docType === 'kehoach';
  const coQuan = inputCoQuanCapTren.value.trim();
  const donVi = inputTenDonVi.value.trim();
  const soVB = inputSoVanBan.value.trim();
  const kyHieu = inputKyHieu.value.trim() || (isKH ? 'KH' : 'CV');
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

  if (isKH) {
    html += `
      <div class="doc-tenLoai">KẾ HOẠCH</div>
      ${trichYeu ? `<div class="doc-trichYeu">${escapeHtml(trichYeu)}</div>` : ''}
    `;
  } else {
    html += trichYeu ? `<div class="doc-trichYeu-cv">V/v ${escapeHtml(trichYeu)}</div>` : '';
    html += kinhGui ? `<div class="doc-kinhGui">Kính gửi: ${escapeHtml(kinhGui)}</div>` : '';
  }

  // Render content as properly formatted paragraphs
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

// ===== EXPORT =====
btnExport.addEventListener('click', async () => {
  const trichYeu = inputTrichYeu.value.trim();
  const noiDung = inputNoiDung.value.trim();
  const tenDonVi = inputTenDonVi.value.trim();

  if (!tenDonVi) {
    showToast('Vui lòng nhập tên đơn vị', 'error');
    return;
  }
  if (!noiDung) {
    showToast('Vui lòng nhập nội dung văn bản', 'error');
    return;
  }

  try {
    btnExport.disabled = true;
    btnExport.textContent = '⏳ Đang tạo file...';

    const data = {
      type: state.docType,
      coQuanCapTren: inputCoQuanCapTren.value.trim(),
      tenDonVi,
      soVanBan: inputSoVanBan.value.trim(),
      kyHieu: inputKyHieu.value.trim(),
      diaDanh: inputDiaDanh.value.trim(),
      ngayThang: inputNgayThang.value,
      chucVu: inputChucVu.value.trim(),
      thuTruong: inputThuTruong.value.trim(),
      trichYeu,
      kinhGui: inputKinhGui.value.trim(),
      noiDung,
      noiNhan: inputNoiNhan.value.trim(),
    };

    const savedFileName = await generateDocument(data);
    showToast(`Đã xuất file: ${savedFileName}`, 'success');
  } catch (err) {
    showToast('Lỗi khi tạo file: ' + err.message, 'error');
    console.error(err);
  } finally {
    btnExport.disabled = false;
    btnExport.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
      Xuất file Word (.docx)
    `;
  }
});

// ===== RESET =====
function resetAll() {
  state.docType = null;
  state.uploadedFile = null;
  state.fileContent = '';
  fileInput.value = '';

  // Reset form
  previewInputs.forEach(input => { input.value = ''; });
  setDefaultDate();

  // Reset UI
  cardKeHoach.classList.remove('selected');
  cardCongVan.classList.remove('selected');
  uploadZone.classList.remove('hidden');
  fileInfo.classList.add('hidden');
  fileContentPreview.classList.add('hidden');
  congvanFields.classList.add('hidden');

  previewDoc.innerHTML = `
    <div class="preview-placeholder">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" opacity="0.3">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/>
      </svg>
      <p>Nhập nội dung để xem trước</p>
    </div>
  `;

  switchStep(stepType);
}

// ===== INIT =====
setDefaultDate();
