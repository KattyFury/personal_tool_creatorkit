# Creator Kit

Web app cá nhân để **soạn bài mạng xã hội bằng giọng văn của chính bạn** và **chèn logo vào ảnh**.
Chạy trên Cloudflare (miễn phí ở mức dùng cá nhân), AI là Claude (trả theo lượt dùng).

Quy trình 3 bước:

1. **Lấy data X** → tải archive của tài khoản X.
2. **Tạo giọng văn + mẫu bài** → hub đọc archive ngay trên trình duyệt, chọn ~150 bài tiêu biểu, AI viết ra
   hồ sơ giọng văn + 6–10 framework (khung bài). Bạn sửa lại cho đúng ý **hiện tại** (bài cũ thường dài hơn,
   icon khác so với bây giờ).
3. **Dùng hằng ngày**:
   - **Soạn bài:** chọn framework → dự án → khoảng số từ → dán chất liệu (hoặc brief bên đặt bài) → ra bài, sửa tiếp bằng 1 câu.
   - **Ảnh:** thả ảnh → crop / cao 540px → khung màu thương hiệu → logo + @handle → tải về. Ảnh xử lý ngay trên máy, không upload.

---

## Cài đặt (1 lần, ~20 phút)

Cần: tài khoản [Cloudflare](https://dash.cloudflare.com) (free), API key [Anthropic](https://console.anthropic.com) (nạp $5 là dùng được lâu), Node.js 20+.

> Mẹo: mở thư mục repo bằng Claude Code rồi nói "cài giúp mình theo README" – nó sẽ chạy các lệnh dưới đây.

```bash
npm install
npx wrangler login                         # đăng nhập Cloudflare trên trình duyệt
npx wrangler d1 create creator-kit         # tạo database → copy database_id vào wrangler.jsonc
npm run db:init                            # tạo bảng
npx wrangler secret put ANTHROPIC_API_KEY  # dán key Anthropic
npx wrangler secret put HUB_PASSWORD       # mật khẩu để vào app (tự đặt)
npx wrangler secret put SESSION_SECRET     # chuỗi ngẫu nhiên dài bất kỳ, vd 40 ký tự
npm run deploy                             # in ra link https://creator-kit.<tên>.workers.dev
```

`secret put` hỏi giá trị – gõ tay vào terminal. **Đừng pipe giá trị vào lệnh này trên Windows PowerShell** (vd `"abc" | npx wrangler secret put …`): giá trị bị lệch, đăng nhập sẽ báo sai mật khẩu.
Cần chạy tự động (script, Claude Code) thì ghi 3 secret vào 1 file JSON rồi dùng `secret bulk`, xong xoá file:

```bash
# secrets.json: {"ANTHROPIC_API_KEY":"...","HUB_PASSWORD":"...","SESSION_SECRET":"..."}
npx wrangler secret bulk secrets.json
```

Muốn dùng tên miền riêng: bỏ comment dòng `routes` trong `wrangler.jsonc`, sửa thành tên miền của bạn (tên miền phải nằm trong Cloudflare), deploy lại.

## Lần đầu dùng

1. Mở link, nhập `HUB_PASSWORD`, tick "Nhớ máy này" (nhớ 90 ngày).
2. **Lấy archive X:** X → Settings → Your account → **Download an archive of your data**. X gửi file sau 1–2 ngày.
   Giải nén, mở thư mục `data`.
3. Vào **Soạn bài → Giọng văn**:
   - Điền **Tên bạn**.
   - **Tạo từ data X** → chọn cùng lúc `account.js`, `tweets.js` (+ `tweets-part1.js`… nếu có), `note-tweet.js`. Nên làm trên máy tính (file nặng).
   - Sửa ô **"Phong cách bạn muốn BÂY GIỜ"**: độ dài, bộ icon mở bài, icon trong bài, điều cấm. Đây là chỗ quan trọng nhất – AI theo phần này khi bài cũ lệch.
   - Bấm **Tạo giọng văn** (~$0,3) → đọc kỹ, sửa chỗ sai → **Lưu**.
   - Bấm **Tạo framework** (~$0,2) → bỏ chọn cái không cần → **Lưu vào Framework**.
4. **Dự án:** tạo dự án / thương hiệu bạn hay viết, thêm brief cố định (dự án là gì, @handle, link, luật riêng, điều cần tránh).
5. **Ảnh:** chọn màu chính, tải logo lên, điền @handle, bấm **Lưu preset**.

## Chi phí

- Cloudflare Workers + D1: free tier đủ dùng cá nhân.
- Claude (`claude-sonnet-5-5`): bài đầu ~$0,04, các bài sau ~$0,01–0,02 (giọng văn được cache). Tạo giọng văn + framework từ archive ~$0,5 một lần.
- Mỗi bài hiện chi phí ngay trên kết quả.

## Riêng tư

- Archive X **không** rời máy bạn: trình duyệt tự đọc, chỉ gửi ~150 bài đã chọn cho Claude để phân tích.
- Mỗi người deploy bản riêng: database, mật khẩu, key là của riêng bạn. Không ai trong nhóm xem được bài của nhau.
- Không commit key / mật khẩu vào repo (`.dev.vars`, `.env*` đã nằm trong `.gitignore`).

## Chạy thử trên máy

```bash
printf "ANTHROPIC_API_KEY=...\nHUB_PASSWORD=...\nSESSION_SECRET=...\n" > .dev.vars
npm run db:init:local
npm run dev            # http://localhost:8787
```

## Tuỳ chọn: phân tích archive bằng Python

`scripts/x-archive.py` làm giống bước 2 nhưng chạy ngoài app (xuất `top.md`, `recent.md`, `stats.txt`) – dùng khi muốn tự đưa cho Claude / ChatGPT phân tích:

```bash
python -X utf8 scripts/x-archive.py <archive>/data out --since 2025-01-01
```

## Cấu trúc

| Đường dẫn | Làm gì |
|---|---|
| `src/worker.ts` | API: đăng nhập, dự án, soạn bài, framework, giọng văn, tạo từ data X |
| `src/skeleton.ts` | Khung hồ sơ giọng văn mà AI điền |
| `public/app.js` | Giao diện (JS thuần, không build) |
| `public/xarchive.js` | Đọc archive X trong trình duyệt |
| `public/img.js` | Xử lý ảnh bằng canvas |
| `schema.sql` | Bảng D1 |

## License

[MIT](LICENSE) – dùng, sửa, chia sẻ thoải mái.
