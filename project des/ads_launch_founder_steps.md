# Google Ads — các bước founder bấm (thử 4 tuần, ~$10/ngày)

Chiến dịch: **Dynamic Search Ads (DSA)** chạy trên 3 loại trang: market map (danh sách công ty), report, transcript.
Tất cả file đã chuẩn bị sẵn và để **Paused**: import xong chưa tốn đồng nào cho đến khi anh tự bật ở Bước 4.
Ngân sách thử: ~$300/tháng, 4 tuần. **Đi tiếp nếu ≥ 3 đơn hoặc CPA < $40.** Không thì dừng (Bước 6).

## Bước 0 — LÀM TRƯỚC, nếu không quảng cáo sẽ dẫn khách vào ngõ cụt
1. Vào `kiraresearch.com/en/admin/config`, mục **Checkout**: bật `checkout.single_report_enabled` và `checkout.transcript_enabled` (market map/list đã bật từ 24/11).
2. Trước khi bật, đọc `kiraresearch.com/en/terms` (điều khoản). Bật xong, tự mua thử 1 transcript (rẻ nhất, $14) bằng thẻ của anh, không cần tài khoản, rồi hoàn tiền trong PayPal để chắc luồng thanh toán chạy.
3. Nếu để hai công tắc đó tắt, trang report hiện "Request access", trang transcript không bán được: quảng cáo vẫn chạy nhưng không ra đơn. File chiến dịch tự bỏ giá report/transcript khỏi mô tả khi công tắc còn tắt.
4. Địa điểm mặc định chỉ gồm Japan, South Korea, Singapore, Taiwan, Australia, US. **UK và EU đã bỏ**: site chưa có banner đồng ý cookie, còn UK/EEA cần Consent Mode v2. Muốn thêm UK/EU thì phải làm consent banner trước, rồi mới thêm địa điểm.

## Bước 1 — Tạo tài khoản Google Ads
1. Vào `ads.google.com/home/tools/manager-accounts` → **Create a manager account**. Đặt tên "KIRA/BizDirect MCC", email `hello@kiraresearch.com`.
2. Trong MCC, bấm nút xanh **+** (Accounts) → **Create new account**. Tên: "KIRA Research". Quốc gia, múi giờ, tiền tệ: **USD** (không đổi được sau này).
3. Đừng dựng tài khoản BizDirect lúc này; tạo sau, dưới cùng MCC. Hai tài khoản tách riêng là đúng (xem Bước 5 về phủ định chéo).
4. Thêm thẻ thanh toán ở **Billing**. Đặt ngân sách tháng đúng $300 để dễ kiểm soát.

## Bước 2 — Nối GA4 và conversion
1. Trong tài khoản KIRA: **Admin** (biểu tượng cờ-lê) → **Linked accounts** → **Google Analytics (GA4)** → **Details** → chọn property `G-N1891GBDCB` → **Link**. Bật cả **Import app and web metrics** và **Enable auto-tagging** (Admin → Account settings → Auto-tagging: **Yes**).
2. Trong GA4 (analytics.google.com) → Admin → **Events**: tìm `generate_lead`, bật công tắc **Mark as key event**.
3. **Mua hàng (Primary):** site bắn event GA4 `purchase` (có giá trị thật, 1 lần/đơn) sau khi PayPal xác nhận đơn report, transcript, danh sách (market map) hoặc gói subscription. Sau khi có đơn đầu tiên (đơn thử ở Bước 0 cũng được), vào GA4 → Admin → Events, đợi `purchase` xuất hiện, bấm **Mark as key event**. Rồi trong Ads → **Goals** → **Conversions** → **+ New conversion action** → **Import** → **Google Analytics 4 properties (web)** → tick `purchase` → Import, đặt **Primary** (dùng giá trị từ GA4).
4. **Lead (Secondary):** cùng màn đó, import `generate_lead` nhưng đặt **Secondary** (chỉ để xem, không dùng để tối ưu).
5. Tuỳ chọn: tải CSV conversions ở `/en/admin/funnel` ("Download conversions for Google Ads") và upload ở **Goals → Uploads** như số đối chiếu phụ (đặt là Secondary, như `generate_lead`, để một sign-up không bị tính hai lần).

## Bước 3 — Tải file và import bằng Google Ads Editor
1. Cài **Google Ads Editor** (`ads.google.com/home/tools/ads-editor`), đăng nhập, tải tài khoản KIRA về (**Add account → Get recent changes**).
2. Vào `kiraresearch.com/en/admin/funnel` (đăng nhập admin), kéo xuống khối **From Google Ads**, dòng **Dynamic Search Ads test**. Bấm lần lượt 3 nút:
   - **Page feed (CSV)** → `kira-ads-page-feed.csv`: danh sách URL + nhãn (`kind_map` / `kind_report` / `kind_transcript`, `country_<tên>`, `price_<số>`). Chỉ có trang EN được index; không có trang noindex, coming-soon, admin, ngôn ngữ khác.
   - **DSA campaign file** → `kira-ads-dsa-campaign.csv`: 1 chiến dịch DSA, 3 nhóm quảng cáo (map, report, transcript), **Paused**, $10/ngày, 6 địa điểm: Japan, South Korea, Singapore, Taiwan, Australia, US (không UK/EU, xem Bước 0); ngôn ngữ English.
   - **DSA negative keywords** → `kira-dsa-negative-keywords.txt`.
3. Trong Editor: menu **Account → Import → From file…** → chọn `kira-ads-dsa-campaign.csv` → **Process** → xem màn hình **Review** → **Finish and review changes**. Nếu Editor báo lỗi cột, **chụp màn hình/ copy dòng lỗi gửi lại** (file này chưa thử trên Editor thật; nếu nhóm "Dynamic ad target" bị từ chối, tạo tay: trong nhóm → **Dynamic ad targets** → **Custom label** → "equals" `kind_map` v.v.).
4. **Nối page feed** (làm trong giao diện web Google Ads, không qua file): **Tools → Shared library → Business data → + → Page feed** (hoặc Assets → Page feeds) → upload `kira-ads-page-feed.csv`. Sau đó mở chiến dịch DSA → **Settings → Dynamic Search Ads settings**: **Targeting source = "Use only URLs from my page feed"**, chọn feed vừa upload. (Đừng để "Google-indexed pages of my website": Google sẽ quét cả site, kể cả trang không muốn quảng cáo.)
5. Cùng trang Settings: **tắt "Final URL expansion"** (AI Max / URL expansion). Tracking template giữ `{lpurl}` (file đã điền; `gclid` được giữ theo tự động tag) và Final URL suffix `utm_source=google&utm_medium=cpc&utm_campaign={campaignid}` (file đã điền, track.js của site đọc đúng).
6. Phủ định: **Tools → Shared library → Negative keyword lists → + → "KIRA DSA negatives"** → dán nội dung `kira-dsa-negative-keywords.txt` (bỏ các dòng bắt đầu bằng `#`) → **Apply to campaign** → chọn chiến dịch DSA.
7. Locations: kiểm tại **Settings → Locations**; **Location options → Presence** (chỉ người đang ở đó), không để "Presence or interest".

## Bước 4 — Kiểm Paused rồi mới bật
1. Trong Editor, cột Status của campaign, 3 ad group, target và ad phải đều **Paused**. Budget **$10/ngày**, Bidding **Manual CPC** (max CPC $1.50 đã điền; chưa dùng Maximize conversions khi chưa có 15–30 conversion).
2. Bấm **Post** (đăng thay đổi lên Google). Vẫn chưa chạy vì Paused.
3. Trên web: kiểm "Final URL expansion" đã Off, page feed đã gắn, negative list đã apply, `/en/terms` + Bước 0 xong.
4. Bật: trong web Google Ads, chiến dịch → **Enable**; ba ad group → **Enable**; target và ad cũng phải **Enabled**. Ghi ngày bật vào sổ (đếm 4 tuần từ đó).

## Bước 5 — Việc mỗi tuần (15 phút)
1. **Insights & reports → Search terms** (hoặc Campaign → Keywords → Search terms). Xem 7 ngày qua: truy vấn nào không liên quan (tìm nhà phân phối, email, số điện thoại, việc làm, miễn phí…) → chọn → **Add as negative keyword** → vào list "KIRA DSA negatives".
2. **Luật cùng chủ (BizDirect):** không để hai quảng cáo của cùng một chủ hiện cho một truy vấn. Danh sách phủ định đã chặn: distributor(s), distributors list, list of companies, company list, directory, supplier(s), supplier list, manufacturers list, importers list, contact(s), email, phone, b2b database. Chữ "list" đơn lẻ **không** phủ định: KIRA chỉ bán file danh sách qua market map nên truy vấn kiểu "<ngành> companies <nước>" vẫn đáng chạy. Khi tạo tài khoản BizDirect, làm ngược lại: phủ định "market report, market research, market size, report, analysis, transcript, interview".
3. Xem bảng: chi phí, click, CPC. Đơn: cột Conversions của `purchase` trong Ads, đối chiếu PayPal + `/en/admin/funnel`. Ghi lại: tổng chi, số đơn, CPA.
4. Trang không ra click sau 2 tuần: bỏ nhãn đó khỏi feed (hoặc thông báo để sửa feed, tải lại, upload đè).

## Bước 6 — Điều kiện dừng / đi tiếp (sau 4 tuần)
- **Đi tiếp** nếu có ≥ 3 đơn **hoặc** CPA < $40 (chi tổng ÷ số đơn). Khi đó: nâng ngân sách từng bước, chuyển sang Maximize conversions khi đã có ≥ 15–30 conversion.
- **Dừng** nếu hết 4 tuần mà dưới 3 đơn và CPA ≥ $40: tắt campaign (Pause), giữ lại số liệu search term để chỉnh trang.
- **Dừng sớm** nếu tiêu quá $300 tổng mà chưa có đơn, hoặc Google báo vi phạm chính sách.
