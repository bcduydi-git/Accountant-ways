# PROGRESS — Sổ Sách Người Để Lại

Nguồn sự thật: `SPEC.md` (bản 0.2). File này đủ để phiên sau làm tiếp.

## Checklist theo "Hoàn thành khi" (SPEC mục 10)

### M0 — Engine
- [x] Toàn bộ test 5.6 xanh (cân Nợ/Có, CĐKT cân, LCTT khớp tiền, LCTT trực tiếp = gián tiếp, sau kết chuyển 5–9 = 0 và LN = Δ421, kịch bản pass schema và tự cân)
- [x] Nhập tay 10 bút toán mẫu (màn debug) ra ba báo cáo cân

### M1 — Hồ sơ 1, T1–T3
- [x] Chơi trọn 3 tháng (kiểm bằng Playwright: nhập đúng, nhập sai, xem đáp án, khóa sổ 3 tháng)
- [x] Mọi đáp án kịch bản tự cân
- [x] Golden test cho rule đã bật (tests/golden/rules.test.ts, mọi rule đều có test)

### M2 — Hết Hồ sơ 1
- [x] Ít nhất 3 bất thường cài và chấm được (Tầng 2): Hồ sơ 1 có 4 bất thường (phải thu tăng nhanh hơn doanh thu, phải thu quá hạn không dự phòng, tồn kho phình, vay ngắn hạn tài trợ TSCĐ)
- [x] Đối chiếu LN kế toán → TNCT khớp engine (Tầng 3 rút gọn): test `tests/tiers.test.ts` và test kịch bản (chi phí thuế đã ghi = đáp án đối chiếu)
- [ ] **CHƯA ĐẠT** — Mẫu BCTC chính thức TT 99: không đọc được văn bản gốc (mạng chặn), giữ `temp-simplified` có nhãn "Mẫu tạm" theo phương án dự phòng. Muốn thay: thêm `data/report-templates/tt99-official.json` cùng cấu trúc rồi đổi `reportTemplate` trong `case.json`.
- [x] Hồ sơ 1 đủ tháng 1–9 + tháng 10–12 gộp (74 nghiệp vụ), người chơi tự ghi thuế TNDN và tự kết chuyển

### M3 — Hồ sơ 2
- [x] Hồ sơ 2 đủ 12 tháng (116 nghiệp vụ): NVL, CCDC (242), 621/622/627 → 154 → 155, dở dang tháng 6, TSCĐ và khấu hao, vay trung hạn + lãi, góp thêm vốn, kiểm toán giữa năm, phạt, thuế TNDN, kết chuyển
- [x] Tầng 2: 4 bất thường (tồn kho phình, khấu hao bất thường, vốn góp thiếu mà lãi vay lớn, vay ngắn hạn tài trợ tài sản dài hạn)
- [x] Tầng 3 (a): đối chiếu khớp engine (tiền mặt từ 5 triệu, phạt, khấu hao tài sản không dùng cho SXKD); rule tắt hiện để tham khảo
- [x] Tầng 3 (b): 4 điều chỉnh (242 → chi phí kỳ, dự phòng do kịch bản cho sẵn số, lãi vay vốn hóa sai, ván hỏng), CĐKT/KQKD trước/sau
- Ghi chú: dự phòng dùng số kịch bản cho sẵn (TT 48 chưa đọc); thời gian khấu hao do kịch bản cho, không chấm khung TT 45; trần ô tô 1,6 tỷ là rule unverified đang TẮT

### M4 — Hồ sơ 3
- [x] Hồ sơ 3 đủ 12 tháng (135 nghiệp vụ): hai mảng SX/TM trên một sổ theo mã mảng (511, 521, 632, 641), có bảng KQKD theo mảng; hàng bán bị trả lại (521, quy tắc bản chất cấm ghi Nợ 5111); cổ đông cho vay; bán cho công ty chị em giá ưu đãi
- [x] Tầng 2: 4 bất thường (phải thu bên liên quan lớn, thuyết minh bộ phận không khớp KQKD, tờ khai GTGT thấp hơn sổ, lãi nhưng LCTT KD âm)
- [x] Tầng 3 (a) khớp engine; (b) 4 điều chỉnh gồm phân loại lại khoản cho bên liên quan vay (131 → 1283), doanh thu sai kỳ, khăn mốc, dự phòng

### M5 — Asset
- [ ] **CHƯA ĐẠT — Font đủ dấu**: chưa có file font trong `assets/_raw/` nên chưa thử dấu được. Trang `/font-test` đã dựng sẵn (chữ thường và in hoa có dấu theo SPEC 9, cỡ thực tế, so sánh tabular-nums). Đặt font vào rồi mở trang này để tự kiểm.
- [x] CREDITS.md liệt kê đủ gói, tác giả, giấy phép, link gốc và trạng thái (chưa tải)
- [x] Có sẵn code nạp sprite và font (`src/scene/assets.ts` + `data/asset-manifest.json`), thiếu file thì tự rơi về hình giữ chỗ. Nhân vật và thoại có ở cả 3 hồ sơ (thoại mở tháng, kết năm, lời kể từng nghiệp vụ, giải thích của kế toán trưởng).

#### Đường dẫn cần đặt file (sửa được trong `data/asset-manifest.json`)
| File | Đặt tại | Khai báo |
|---|---|---|
| Be Vietnam Pro Regular/SemiBold/Bold | `assets/_raw/be-vietnam-pro/BeVietnamPro-Regular.ttf`, `-SemiBold.ttf`, `-Bold.ttf` | `fonts.body` |
| Cairopixel | `assets/_raw/cairopixel/Cairopixel.ttf` | `fonts.pixel` |
| VT323 | `assets/_raw/vt323/VT323-Regular.ttf` | `fonts.pixelAlt` |
| Nhân vật (Pixel Office, 2dPig) | `assets/_raw/pixel-office/...` | `characters.<id>`: `"/_raw/pixel-office/<file>.png"` hoặc `{ "src": ..., "frame": [x, y, w, h] }`. Có 11 id: h1-chu-tu, h1-ba-may, h1-be-na, h2-co-ngan, h2-ong-bao, h2-anh-cua, h2-ha-vy, h3-chi-lam, h3-ong-thuy, h3-anh-khoa, h3-can-bo-thue |
| Nền văn phòng, bàn, cây | `assets/_raw/pixel-office/...` | `office.background`, `office.desk`, `office.plant` |
| UI (Kenney) | `assets/_raw/kenney-pixel-ui/...` | `ui.panel`, `ui.button` (chưa dùng trong CSS) |

Vite phục vụ `assets/` như thư mục tĩnh (`publicDir`), nên `/_raw/...` trỏ tới `assets/_raw/...`.

## Kiểm chứng pháp lý
- 30/10/2026: mạng của phiên chặn mọi nguồn chính thức và thuvienphapluat.vn (403 tại proxy). **Không đọc được văn bản gốc nào.** Xem OPEN_QUESTIONS.md mục 1–2.
- Muốn kiểm chứng: thêm các domain trên vào Allowed domains của môi trường, rồi đọc văn bản và cập nhật `data/rules/*.json` + golden test.

## Kiến trúc (để phiên sau làm tiếp)
- `src/engine/ledger.ts` có `Ledger.post()` là cửa duy nhất ghi sổ; `reports.ts` tính CĐKT, KQKD, LCTT trực tiếp và gián tiếp từ sổ; `closing.ts` sinh kết chuyển (chỉ dùng cho đáp án và Tầng 2); `scoring.ts` chấm theo vector số dư cộng quy tắc bản chất.
- `src/tax/rules.ts`: rule engine theo `kind`, số liệu nằm trong `data/rules/*.json`.
- `src/data/schema.ts` (zod) + `registry.ts` (import.meta.glob data/**).
- `src/game/case-runtime.ts`: dựng sổ đáp án, giải `$calc`, chấm sự kiện, sổ Tầng 2 và sổ công ty Tầng 3b. `save.ts`: localStorage, xuất/nhập.
- `src/ui/*`: các màn; `src/scene/*`: canvas pixel và nạp asset.
- Test: `tests/invariants` (5.6 + kịch bản), `tests/golden` (rule), `tests/lint` (chặn hằng số pháp lý trong src/).

## Soạn kịch bản
- Dữ liệu game là JSON trong `data/cases/<hồ-sơ>/`. JSON được sinh bằng `node scripts/build-ho-so-N.mjs` (công cụ soạn, đọc thuế suất từ data/rules, tự tính GTGT, khấu trừ, nộp thuế). Sửa script rồi chạy lại, sau đó `npm test`.

## Trạng thái rule (data/rules)
| Rule | Trạng thái | Bật? |
|---|---|---|
| cit-rate (15/17/20% theo doanh thu năm trước) | verified-secondary | Bật |
| vat-reduction-8 (GTGT 8%) | verified-secondary | Bật |
| vat-input-noncash-threshold (từ 5 triệu phải không dùng tiền mặt; mất khấu trừ và mất chi phí được trừ) | verified-secondary | Bật |
| cit-admin-penalty (tiền phạt, tiền chậm nộp) | verified-secondary | Bật |
| cit-nonbusiness-depreciation | verified-secondary | Bật |
| cit-passenger-car-cap (1,6 tỷ) | unverified | Tắt |
| cit-interest-uncontributed-capital | unverified | Tắt |
| cit-noncredit-interest-cap (BLDS) | unverified | Tắt |
| depreciation-frame-tt45 | unverified | Tắt (phương án dự phòng: kịch bản tự cho thời gian khấu hao) |
| provision-tt48 | unverified | Tắt (phương án dự phòng: kịch bản cho sẵn số phải trích) |
| invoice-validity | unverified | Tắt |

## Ghi chú cho phiên sau
- Lần chạy cuối: `npm test` → 125 test xanh, 1 skip (`tests/tools/inspect.test.ts` là công cụ xem số liệu, chạy bằng `INSPECT=ho-so-1 npx vitest run tests/tools`). `npm run build` xanh.
- Việc còn mở: (1) đọc văn bản gốc khi mạng cho phép, nâng rule lên verified-primary, thay mẫu BCTC TT 99; (2) đặt asset vào `assets/_raw/` và thử dấu ở `/font-test`.
