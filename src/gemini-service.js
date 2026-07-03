export async function generateDocumentContent(apiKey, model, params) {
  const { trichYeu, yeuCau, refContent, docTypeName } = params;
  
  const systemPrompt = `Bạn là chuyên gia soạn thảo văn bản hành chính Việt Nam, am hiểu sâu sắc Nghị định 30/2020/NĐ-CP.
Nhiệm vụ của bạn là: Viết phần "Nội dung chính" cho một bản ${docTypeName.toUpperCase()}.
Quy tắc cực kỳ quan trọng:
- CHỈ viết phần thân nội dung (không viết phần kính gửi, không viết quốc hiệu, tiêu ngữ, ngày tháng, nơi nhận, người ký).
- Văn phong chuẩn hành chính nhà nước, trang trọng, ngắn gọn, súc tích, rõ ràng.
- Đánh số mục lục chuẩn: 
  + Đối với Kế hoạch: I, II, III... rồi đến 1, 2, 3... rồi đến a, b, c...
  + Đối với Công văn: 1, 2, 3... rồi đến a, b, c... (hoặc gạch đầu dòng).
- KHÔNG sử dụng cú pháp markdown phức tạp như in đậm (**), in nghiêng (*). Chỉ dùng text thường với thụt lề và xuống dòng.
- Không tự bịa thêm thông tin ngoài lề nếu không có trong Trích yếu hoặc Tài liệu tham khảo.`;

  const userPrompt = `CHỦ ĐỀ/TRÍCH YẾU VĂN BẢN: ${trichYeu}
YÊU CẦU CHI TIẾT CỦA NGƯỜI DÙNG: ${yeuCau || 'Viết nội dung đầy đủ, cấu trúc hợp lý, dựa theo chủ đề trên.'}
${refContent ? `\nTÀI LIỆU THAM KHẢO (hãy chắt lọc và sử dụng thông tin từ đây để viết):\n${refContent.substring(0, 10000)}` : ''}

Hãy viết phần nội dung chính của văn bản ngay bên dưới:`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        { role: 'user', parts: [{ text: systemPrompt + '\n' + userPrompt }] }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 3000,
      }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Lỗi khi kết nối với Gemini API');
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Không nhận được văn bản từ AI. Vui lòng thử lại.');
  
  // Dọn dẹp markdown dư thừa (như bold, italic) nếu AI vẫn cứng đầu
  const cleanText = text.replace(/\*\*/g, '').replace(/\*/g, '').replace(/#/g, '');
  return cleanText;
}
