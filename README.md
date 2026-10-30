# Sổ Sách Người Để Lại

Game học kế toán Việt Nam (web tĩnh, TypeScript + Vite + Vitest). Đặc tả: `SPEC.md` (bản Di giữ). Tiến độ: `PROGRESS.md`. Điểm chưa rõ: `OPEN_QUESTIONS.md`.

```bash
npm install
```

```bash
npm run dev
```

```bash
npm test
```

- Mở http://localhost:5173: menu chọn hồ sơ, màn debug, trang quy định/rule, thử font (`/font-test`).
- Dữ liệu kịch bản: `data/cases/` (JSON). Sinh lại bằng `node scripts/build-ho-so-1.mjs` (tương tự 2, 3).
- Asset (không commit): `assets/_raw/<tên-gói>/`, khai báo đường dẫn trong `data/asset-manifest.json`.
