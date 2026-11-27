# Google Ads — các bước founder bấm (chiến dịch từ khóa, thử 4 tuần, ~$200–300/tháng)

Chốt 27/11/2026: dùng **chiến dịch từ khóa** dựng từ topic của mình (mỗi topic một nhóm quảng cáo, trang topic là trang đích), **không dùng DSA** (Google đang đưa DSA vào AI Max, tự chuyển dự kiến tháng 2/2027).
File đã chuẩn bị sẵn và để **Paused**: import xong chưa tốn đồng nào cho đến khi anh tự bật ở Bước 4.
Ngân sách: ~$200–300/tháng (anh chọn), thử 4 tuần. **Đi tiếp nếu ≥ 3 đơn hoặc CPA < $40.** Không thì dừng (Bước 6).

## Bước 0 — LÀM TRƯỚC, nếu không quảng cáo sẽ dẫn khách vào ngõ cụt
1. Vào `kiraresearch.com/en/admin/config`, mục **Checkout**: bật `checkout.single_report_enabled` và `checkout.transcript_enabled` (list/market map đã bật từ 24/11). Subscription đã ẩn, đừng bật.
2. Trước khi bật, đọc `kiraresearch.com/en/terms`. Bật xong, tự mua thử **transcript rẻ nhất ($14)** bằng thẻ của anh (không cần tài khoản), rồi **hoàn tiền trong PayPal** để chắc luồng thanh toán chạy.
3. Nếu hai công tắc đó còn tắt, trang report hiện "Request access": quảng cáo vẫn chạy nhưng không ra đơn. File tự bỏ giá khỏi quảng cáo khi công tắc tắt. Giá trong quảng cáo là giá thật của từng report đã xuất bản (tính theo công sức, không còn $29/$39/$49 cố định); topic chưa xuất bản thì quảng cáo không nêu giá.
4. Địa điểm mặc định: Japan, South Korea, Singapore, Taiwan, Australia, US. **UK/EU đã bỏ** vì site chưa có banner đồng ý cookie (Consent Mode v2). Muốn thêm thì làm banner trước.

## Bước 1 — Tạo tài khoản Google Ads
1. `ads.google.com/home/tools/manager-accounts` → **Create a manager account**, tên "KIRA/BizDirect MCC", email `hello@kiraresearch.com`.
2. Trong MCC, nút **+** (Accounts) → **Create new account**, tên "KIRA Research", tiền tệ **USD** (không đổi được sau này).
3. Chưa dựng tài khoản BizDirect; để sau, dưới cùng MCC (tách riêng là đúng).
4. **Billing**: thêm thẻ, đặt ngân sách tháng đúng mức anh chọn ($200–300).

## Bước 2 — Nối GA4 và conversion
1. Tài khoản KIRA → **Admin** → **Linked accounts** → **Google Analytics (GA4)** → chọn property `G-N1891GBDCB` → **Link**. Bật **Import app and web metrics**. Admin → Account settings → **Auto-tagging: Yes**.
2. **Conversion chính = `purchase`:** site bắn event GA4 `purchase` (có giá trị thật, 1 lần/đơn). Sau đơn thử ở Bước 0, vào GA4 → Admin → Events, đợi `purchase` hiện, bấm **Mark as key event**. Rồi trong Ads: **Goals → Conversions → + New conversion action → Import → Google Analytics 4 properties (web)** → tick `purchase` → Import, đặt **Primary** (dùng giá trị từ GA4).
3. `generate_lead`: import cùng chỗ nhưng đặt **Secondary** (chỉ để xem).

## Bước 3 — Tải file và import bằng Google Ads Editor
1. Cài **Google Ads Editor** (`ads.google.com/home/tools/ads-editor`), đăng nhập, tải tài khoản KIRA về (**Get recent changes**).
2. Vào `kiraresearch.com/en/admin/funnel` (đăng nhập admin), khối **From Google Ads**. Bấm 2 nút:
   - **Keyword campaign file for Google Ads Editor** → `kira-ads-campaign-0-100.csv` (100 topic điểm cao nhất, 1 nhóm/topic, từ khóa phrase + exact, 1 quảng cáo responsive/nhóm, **Paused**, $20/ngày mặc định, Manual CPC $1.00, 6 địa điểm trên, ngôn ngữ English; đã kèm sẵn danh sách từ khóa phủ định).
   - **Negative keyword list (shared)** → `kira-ads-negative-keywords.txt`.
   Các nút ghi "Not used" (page feed, DSA) cứ bỏ qua.
3. Trong Editor: **Account → Import → From file…** → chọn file campaign → **Process** → xem **Review** → **Finish and review changes**. Nếu Editor báo lỗi cột, copy dòng lỗi gửi lại (file chưa thử trên Editor thật).
4. Danh sách phủ định dùng chung: **Tools → Shared library → Negative keyword lists → + → "KIRA negatives"**, dán nội dung file txt (bỏ dòng bắt đầu bằng `#`) → **Apply to campaign**. (Campaign file đã có sẵn các từ này ở cấp chiến dịch; list dùng chung để sau này thêm từ mới ở một chỗ.)
5. **Settings → Locations → Location options → Presence** (chỉ người đang ở đó), không chọn "Presence or interest". Tracking: Final URL suffix gắn sau bằng tay nếu muốn `utm_source=google&utm_medium=cpc&utm_campaign={campaignid}`; auto-tagging đã đủ cho `gclid`.
6. Muốn đổi ngân sách/CPC/địa điểm: tải lại file với `?budget=15&cpc=0.8&locations=Japan,Singapore` (nhờ dev, hoặc sửa thẳng trong Editor).

## Bước 4 — Kiểm Paused rồi mới bật
1. Trong Editor, Status của campaign, ad group, từ khóa, quảng cáo đều **Paused**. Budget đúng ý ($20/ngày ≈ $600/tháng nếu tiêu hết: **hạ xuống ~$8–10/ngày** để khớp $200–300/tháng).
2. Bấm **Post**. Vẫn chưa chạy vì Paused.
3. Trên web Google Ads: chiến dịch → **Enable**; ad group → **Enable** (có thể bật 10–20 nhóm đầu rồi mở dần); từ khóa và quảng cáo cũng phải **Enabled**. Ghi ngày bật (đếm 4 tuần từ đó).

## Bước 5 — Việc mỗi tuần (15 phút)
1. **Insights & reports → Search terms**, 7 ngày qua: truy vấn không liên quan (nhà phân phối, email, số điện thoại, việc làm, miễn phí…) → **Add as negative keyword** vào list "KIRA negatives".
2. Luật cùng chủ (BizDirect): hai quảng cáo của cùng một chủ không hiện cho một truy vấn. List phủ định đã chặn distributor(s), supplier list, company list, contact, email, phone… Chữ "list" đơn lẻ không bị chặn (market map bán file danh sách). Khi tạo tài khoản BizDirect, phủ định ngược lại: "market report, market research, market size, analysis, transcript, interview".
3. Ghi lại: tổng chi, click, CPC, số đơn (cột Conversions của `purchase`, đối chiếu PayPal + `/en/admin/funnel`), CPA.
4. Nhóm không ra click sau 2 tuần: tạm dừng nhóm đó.

## Bước 6 — Điều kiện dừng / đi tiếp (sau 4 tuần)
- **Đi tiếp** nếu ≥ 3 đơn **hoặc** CPA < $40 (tổng chi ÷ số đơn). Khi đó tăng ngân sách từng bước; chuyển Maximize conversions khi đã có 15–30 conversion.
- **Dừng** nếu hết 4 tuần mà < 3 đơn và CPA ≥ $40: Pause chiến dịch, giữ số liệu search term để chỉnh trang.
- **Dừng sớm** nếu tiêu quá mức ngân sách tháng mà chưa có đơn, hoặc Google báo vi phạm chính sách.

## Về sau: AI Max
Khi chiến dịch từ khóa đã chạy ≥ 4 tuần và có số liệu, thử **AI Max for Search** bằng **Campaign Experiment** (Google Ads → Experiments → tạo bản thử từ chiến dịch này, bật AI Max ở bản thử, chia 50/50 ngân sách) để so với chiến dịch gốc. Chưa làm bây giờ. File page feed (`kind=pagefeed`) giữ lại để dùng cho "URL inclusions" của AI Max.
