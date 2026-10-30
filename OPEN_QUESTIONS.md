# OPEN_QUESTIONS — điểm spec chưa rõ và phương án tạm đã chọn

Mỗi mục: câu hỏi → phương án đã chọn (đơn giản, dễ đổi) → chỗ cần sửa nếu đổi.

## Kiểm chứng pháp lý
1. **Không truy cập được nguồn chính thức.** Mạng của phiên chặn vbpl.vn, thuvienphapluat.vn, chinhphu.vn, congbao.chinhphu.vn, mof.gov.vn. → Không rule nào lên `verified-primary`. Rule mà SPEC 7.2 đã ghi `[ĐÃ KIỂM CHỨNG]` (nguồn thứ cấp) giữ `verified-secondary` và BẬT, đúng SPEC 5.4. Rule thuộc mục 8.3, 8.4, 8.7 mà game cần riêng cho M3+ (trần ô tô 1,6 tỷ, lãi vay tương ứng vốn góp thiếu, trần lãi vay BLDS, khung khấu hao TT 45, dự phòng TT 48, hóa đơn hợp lệ) để `unverified` và TẮT theo chỉ dẫn của Di. → Sửa `status` trong `data/rules/*.json` sau khi đọc văn bản gốc.
2. **Ngưỡng 5 triệu ảnh hưởng thuế TNDN** (NĐ 320 Điều 9.1.c) thuộc mục 8.3, nhưng SPEC 7.2 ghi đã kiểm chứng và M1 bắt buộc có rule này. → Giữ chung một rule `vat-input-noncash-threshold` (đúng ví dụ ở SPEC 5.4), trạng thái `verified-secondary`, BẬT.

## Kế toán và engine
3. **Chưa có mẫu BCTC TT 99** (8.1). → Dùng `data/report-templates/temp-simplified.json`, có nhãn "Mẫu tạm" trên mọi màn báo cáo. Mã chỉ tiêu tạm theo thói quen B01/B02/B03 cũ, chưa có B09 (thuyết minh): thuyết minh là bảng dữ liệu trong kịch bản.
4. **TK cấp 2, 3** (1331, 33311, 3334, 4211/4212, 2141, 2293, 3411, 8211...) dùng tạm như TT 200, có cờ `needsCheck`. Tên của TK 158, 215, 332 theo TT 99 chưa rõ nên kịch bản không dùng.
5. **LCTT gián tiếp, giao dịch phi tiền tệ.** Bút toán không qua tiền nhưng nối TK hoạt động KD với TK đầu tư/tài chính (vd mua TSCĐ chịu, phân loại lại khoản cho vay) → phần vốn lưu động của bút toán đó bị loại khỏi điều chỉnh; phần lãi/lỗ đưa vào dòng "Lãi, lỗ từ hoạt động đầu tư, tài chính và giao dịch phi tiền tệ". Nhờ vậy LCTT trực tiếp luôn bằng gián tiếp. Mẫu tạm bỏ hai dòng "chi phí lãi vay"/"tiền lãi vay đã trả" ở phần gián tiếp vì hai dòng này triệt tiêu nhau.
6. **Chi phí 621/622/627 chưa kết chuyển** trong kỳ báo cáo giữa năm: không vào KQKD; ở LCTT gián tiếp xử lý như hàng tồn kho (dòng 10).
7. **Bút toán kết chuyển** = mọi bút toán chạm TK 911 (cấu hình `closingAccount`). KQKD bỏ qua các bút toán này. Người chơi phải kết chuyển qua 911 (quy tắc bản chất `closing-via-911`).
8. **Người chơi sai thì làm sao?** → Chỉ ghi sổ khi đúng. Sai thì được làm lại (điểm còn một nửa) hoặc bấm "Xem đáp án" (ghi đáp án, 0 điểm). Vì vậy sổ của người chơi luôn khớp sổ đáp án, chi phí thuế TNDN và bút toán kết chuyển tính được nhất quán.
9. **Đáp án kết chuyển** tính động từ sổ hiện tại (`$calc: closing`). **Chi phí thuế TNDN** tính bằng rule engine (`$calc: citExpense`): LN kế toán trước thuế + các dòng điều chỉnh của rule đang bật, nhân thuế suất theo doanh thu năm trước. Thu nhập chịu thuế âm thì coi là 0.
10. **Bảo hiểm bắt buộc, thuế TNCN trên lương**: tỷ lệ là con số pháp lý chưa kiểm chứng → kịch bản giản lược, lương trả gộp, không trích bảo hiểm. Lời thoại có nói rõ.
11. **Thuế TNDN tạm nộp quý** (8.6): game tránh, chỉ ghi chi phí thuế TNDN cuối năm. Số thuế năm trước còn phải nộp được nộp trong tháng 3.
12. **Kê khai GTGT theo tháng** (không khẳng định công ty thuộc diện nào): kịch bản tự quy định "công ty kê khai theo tháng". Cuối tháng có bút toán khấu trừ 33311/1331.

## Kịch bản
13. **Nhóm hàng 8%**: Hồ sơ 1 chọn hàng may mặc; Hồ sơ 2 đồ gỗ nội thất (ván MDF, ghế gỗ); Hồ sơ 3 bát đĩa gốm và khăn vải. Theo hiểu biết chung, các nhóm này chịu 10% và được giảm, nhưng danh mục loại trừ (8.5) chưa đối chiếu. Dịch vụ dùng trong kịch bản (sửa chữa, vệ sinh, vận chuyển, in ấn, quảng cáo, bảo trì) cũng chưa đối chiếu.
14. **Giá vốn**: kịch bản cho sẵn giá vốn trên chứng từ xuất kho. Đơn giá mua cố định cả năm nên không cần chọn FIFO hay bình quân. Hồ sơ 2 và 3 bán hết thành phẩm sản xuất trong tháng, giá vốn = giá thành của tháng.
15. **Khấu hao**: kịch bản cho thời gian khấu hao, trích tròn tháng từ tháng đưa vào dùng. Game không chấm đúng/sai khung TT 45.
16. **Lúc nào hiện giải thích của kế toán trưởng khi làm sai?** SPEC 4.2 yêu cầu "kèm giải thích", nhưng giải thích đầy đủ để lộ đáp án. → Sai lần 1: chỉ ra TK lệch, số lệch, khoản mục báo cáo bị chạm, kèm gợi ý. Sai từ lần 2: hiện giải thích đầy đủ. Điểm: đúng ngay 10, đúng sau khi sửa 5, xem đáp án 0.
17. **Bộ BCTC ở Tầng 2** = sổ đáp án (bỏ kết chuyển) + bút toán cài bất thường (`anomalies.json → injections`, vẫn qua post()), rồi kết chuyển lại. Thuyết minh (tuổi nợ, bên liên quan, bộ phận, tờ khai GTGT) là bảng dữ liệu trong kịch bản, nhờ vậy cài được bất thường kiểu "thuyết minh không khớp". Chấm mỗi bất thường 3 điểm (đúng khoản mục, đúng tập báo cáo bị chạm, đúng lý do); số lượt nộp = số bất thường + 3.
18. **Tầng 3**: (a) tính trên sổ đáp án của người chơi. Rule đang tắt vẫn hiện ở cuối bảng, ghi "ước tính", không tính. (b) tính trên "sổ công ty" = sổ đáp án + bút toán sai của kế toán cũ (`adjustments.json → companyBook`). Mỗi điều chỉnh: đúng nhóm và đúng vector thì 4 điểm, đúng sau khi sửa 2, xem đáp án 0.
19. **Kỳ hạn vay** (ngắn/dài hạn trên CĐKT) lấy theo thuộc tính `term` của đối tượng cho vay trong `case.json`, không tách TK 3411.
20. **Hồ sơ 3 theo mảng**: mã mảng bắt buộc trên 511x, 521, 632, 641. Chi phí quản lý (642), chi phí tài chính, chi phí khác không phân bổ theo mảng; bảng "KQKD theo mảng" có cột "Chưa phân bổ".
21. **Giao dịch bên liên quan** (giá bán thấp hơn thị trường, vay cổ đông lãi 12%): chỉ nhận diện và thuyết minh (VAS 26). Không điều chỉnh thuế, vì chuyển giá nằm ngoài mức "Vừa" và trần lãi vay theo BLDS chưa kiểm chứng.
22. **Đường dẫn `/font-test`**: là trang `font-test.html` (Vite phục vụ cả `/font-test` khi chạy dev). Link "Thử font" có ở menu.
23. **Dự phòng (Hồ sơ 2, 3)** chỉ xuất hiện ở Tầng 3(b), số trích lập do kịch bản cho sẵn; Tầng 1 không có bút toán dự phòng.
