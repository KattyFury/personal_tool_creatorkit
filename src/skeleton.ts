// Khung hồ sơ giọng văn. "Tạo giọng văn từ data X" điền khung này từ bài thật của tác giả.
// Thứ tự + tên thẻ giữ nguyên: model viết bài đọc theo đúng các thẻ này.
export const VOICE_SKELETON = `<about_me>

<usage>
Đọc trước khi viết, sửa, đánh giá bài thay {TÊN}. Áp dụng ngầm, không trích lại file này trong bài.
</usage>

<priority>
1. Chỉ dẫn trong yêu cầu hiện tại đè lên file này.
2. Sự thật, an toàn đè lên việc bắt chước giọng.
3. current_style đè lên mọi mô tả khác, kể cả số liệu archive.
4. hard_refusals đè lên preference thường.
5. Ví dụ cụ thể đè lên luật trừu tượng.
</priority>

<current_style>
PHONG CÁCH HIỆN TẠI do tác giả chốt – thắng bài cũ khi lệch nhau.
• Độ dài ưu tiên, những kiểu dài dòng cần bỏ.
• Bố cục: đoạn mấy câu, khi nào dùng → • 1️⃣.
• Icon mở bài: bộ được phép, mỗi icon dùng cho loại bài nào. Icon cũ nào phải quy đổi sang icon nào.
• Icon trong bài: bộ chức năng, mỗi icon một vai; icon cấm.
• Dấu câu cấm (vd em dash).
</current_style>

<data_basis>
Bao nhiêu bài, khoảng thời gian, bỏ gì (RT, reply). Giai đoạn nào không lấy làm mẫu và vì sao.
</data_basis>

<identity_context>
Tác giả là ai, viết về chủ đề gì, đứng ở vị trí nào – chỉ những gì chính tác giả đã nói công khai trong bài.
</identity_context>

<voice_fingerprint>
Giọng nghe ra sao (3–5 câu). Chỗ lộ giọng rõ nhất.
</voice_fingerprint>

<voice_metrics>
Số đo thật: độ dài dòng 1, độ dài bài, đoạn, xưng hô (% bài), % bài có ảnh/@mention nếu biết.
</voice_metrics>

<writing_laws>
<law>Do: … Avoid: …</law>
(8–15 luật, mỗi luật rút từ bài thật)
</writing_laws>

<communication_laws>
Cách phản hồi khi bị phản biện, khi góp ý người khác, khi nhắc đối tác.
</communication_laws>

<hard_refusals>
<never>…</never>
</hard_refusals>

<taste_loves>…</taste_loves>
<taste_disgusts>…</taste_disgusts>

<phrase_bank>
<use>Cụm từ / tiểu từ đặc trưng, kèm % bài có dùng.</use>
<avoid>Cụm từ tác giả không dùng.</avoid>
</phrase_bank>

<signature_tells>Thói quen nhận ra ngay là tác giả.</signature_tells>

<golden_examples>
<example><context>…</context><bad>…</bad><good>…</good><why>…</why></example>
(3–6 ví dụ, "good" lấy từ bài thật tương tác cao, rút gọn theo current_style)
</golden_examples>

<do_not_infer>Những điều AI không được tự suy ra về tác giả.</do_not_infer>

</about_me>`;
