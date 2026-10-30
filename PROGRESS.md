# PROGRESS — Sổ Sách Người Để Lại

Nguồn sự thật: `SPEC.md` (bản 0.2). File này đủ để phiên sau làm tiếp.

## Checklist theo "Hoàn thành khi" (SPEC mục 10)

### M0 — Engine
- [x] Toàn bộ test 5.6 xanh (cân Nợ/Có, CĐKT cân, LCTT khớp tiền, LCTT trực tiếp = gián tiếp, sau kết chuyển 5–9 = 0 và LN = Δ421, kịch bản pass schema và tự cân)
- [x] Nhập tay 10 bút toán mẫu (màn debug) ra ba báo cáo cân

### M1 — Hồ sơ 1, T1–T3
- [ ] Chơi trọn 3 tháng
- [ ] Mọi đáp án kịch bản tự cân
- [ ] Golden test cho rule đã bật

### M2 — Hết Hồ sơ 1
- [ ] Ít nhất 3 bất thường cài và chấm được (Tầng 2)
- [ ] Đối chiếu LN kế toán → TNCT khớp engine (Tầng 3 rút gọn)
- [ ] Mẫu BCTC chính thức TT 99 (hoặc ghi rõ không kiểm chứng được → giữ "Mẫu tạm")

### M3 — Hồ sơ 2
- [ ] Như M2 + Tầng 3 (b)

### M4 — Hồ sơ 3
- [ ] Như M3 + bên liên quan

### M5 — Asset
- [ ] Font đủ dấu (trang /font-test)
- [ ] CREDITS.md đủ

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

## Ghi chú cho phiên sau
