# Creator Kit – quy tắc cho Claude

Web app soạn bài theo giọng văn của người dùng + chèn logo vào ảnh. Cloudflare Worker + D1 + Claude API.
Đọc `README.md` để biết cách cài và luồng dùng.

## Luật
- **Tiết kiệm token:** mỗi lần viết chỉ gửi system (luật + giọng văn + brief dự án, có cache) + 1 user message.
  "Sửa bài" chỉ gửi bản nháp gần nhất, không gửi lịch sử chat. Mỗi dự án giữ tối đa 60 tin.
- Bài mới bắt buộc chọn khoảng từ 50–100 / 100–200 / 200–300 (`WORD_RANGES`). Vượt >15% → server tự rút gọn 1 lần.
- Em dash tự đổi thành en dash ở server.
- Model `claude-sonnet-5-5`, effort medium, server-side fallback bật. Đổi model = đổi chi phí → hỏi chủ repo.
- Archive X chỉ đọc trong trình duyệt (`public/xarchive.js`); server chỉ nhận bài đã chọn (tối đa ~160K ký tự).
- UI theo design system trong `public/ds.css`: chữ qua `--ds-type-*`, không đặt px chữ tay. Tên class mới phải kiểm trùng trong `app.css`.
- Không dán key / mật khẩu vào file được commit. Local dùng `.dev.vars` (gitignored), production dùng `wrangler secret put`.

## Lệnh
```
npm install
npx tsc --noEmit
npm run dev        # cần .dev.vars + npm run db:init:local
npm run deploy
```
