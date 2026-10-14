# IDEA.md — VuaOffice & VuaMail Suite

> Tài liệu ý tưởng gốc từ Product Owner (Sếp Châu). AI không chỉnh sửa mục tiêu cốt lõi — chỉ format và cập nhật cấu trúc.

## Bài toán cần giải quyết
1. **Bộ ứng dụng văn phòng AI-Native VuaOffice**:
   Sản phẩm office suite AI-native (Docs, Sheets, Slides, PDF, Markdown) cần mang thương hiệu Việt (**VuaOffice** by **360 CORP**), loại bỏ nhận diện của upstream GenOffice/Genspark. Hệ thống AI định tuyến trực tiếp qua AI Router riêng của 360 CORP (**vuaaipro / 9router / hermes**) để tối ưu chi phí, tốc độ và bảo mật dữ liệu.

2. **Email Client Ngoại tuyến VuaMail (Outlook Clone)**:
   Doanh nghiệp thiếu một giải pháp Email Client chuyên nghiệp, nhẹ, tốc độ cao, hỗ trợ đầy đủ tiếng Việt và giao diện Microsoft 365 Outlook quen thuộc. Cần tích hợp trực tiếp **VuaMail** (`apps/mail`) vào VuaOffice Suite với khả năng hoạt động Offline (SQLite WAL Engine), OpQueue hàng đợi đồng bộ và trợ lý AI tóm tắt/soạn thảo thư thông minh.

3. **Quy trình Phát triển Song song & Zero-Conflict**:
   `VuaMail` được phát triển chuyên sâu trên repository/nhánh riêng, định kỳ rebase và merge trực tiếp vào `vuaoffice` (nhánh `main`) mà tuyệt đối không gây conflict với các ứng dụng khác trong bộ Office Suite.

## Đối tượng khách hàng
Các khách hàng doanh nghiệp trong hệ sinh thái của **360 CORP**, các doanh nghiệp và chuyên gia cần bộ công cụ văn phòng và email client tích hợp AI tại Việt Nam.

## Vision sản phẩm
- Trở thành hệ sinh thái văn phòng AI-native toàn diện: **VuaOffice** (Docs, Sheets, Slides, PDF) + **VuaMail** (Email, Calendar, Contacts, Tasks).
- Giao diện Fluent UI hiện đại, chuẩn xác theo Microsoft Outlook & Microsoft 365 Ribbon.
- Sử dụng hạ tầng AI Router độc lập (vuaaipro/9router/hermes) làm default provider.
- Cơ chế Whitelabel và Module hóa: Phát triển độc lập từng module và kết hợp liền mạch vào Shell đa tab.

## Giá trị cốt lõi
1. **Thương hiệu đồng nhất:** Tích hợp sâu vào hệ sinh thái 360 CORP với tên gọi VuaOffice và VuaMail.
2. **Offline-First & Siêu tốc:** Lưu trữ dữ liệu SQLite cục bộ, mở thư và tìm kiếm tức thì.
3. **Chủ động hạ tầng AI:** Sử dụng AI Router riêng của 360 CORP để phân phối request AI tối ưu.
4. **Bảo trì & Tích hợp dễ dàng:** Cấu trúc module rõ ràng, merge sạch sẽ với `vuaoffice/main`.
5. **An toàn & Riêng tư:** Dữ liệu email và tài liệu nằm an toàn tại máy người dùng; kết nối mã hoá HTTPS/TLS.

## Hệ sinh thái / Liên kết
Nằm trong hệ sinh thái giải pháp doanh nghiệp của **360 CORP** (cùng với Vua Hệ Thống, CloudPanel, Hermes, 9router, VuaAI Pro...).

---

**Người viết:** Sếp (Product Owner)
**Ngày cập nhật:** 2026-08-15
**Trạng thái:** Confirmed & In Progress
