# Phần mềm quản lý xử lý mẫu, Khoa Giải phẫu bệnh

Ứng dụng web quản lý máy xử lý mô: theo dõi chu kỳ thay hóa chất, ghi nhận lượt chạy, đánh giá chất lượng lame (Đạt / Không đạt kèm ghi chú), lịch sử và báo cáo.

Công nghệ: React + Vite (giao diện), Supabase (cơ sở dữ liệu PostgreSQL và đăng nhập), triển khai trên Vercel qua GitHub.

## Quy tắc nghiệp vụ đã cài sẵn

Mỗi lần thay hóa chất mở một chu kỳ mới và đóng chu kỳ cũ. Định mức mặc định là 13 lít cồn, 6 lít xylen, 5 kg sáp; mỗi chu kỳ chạy tối đa 4 lượt, mỗi lượt tối đa 110 lame (tối đa 440 lame một chu kỳ). Các con số này sửa được trong mục Quản trị, Định mức, và chỉ áp dụng cho các lần thay sau đó.

Các quy tắc được kiểm soát ngay trong cơ sở dữ liệu, không chỉ ở giao diện: không thể ghi lượt chạy khi chưa thay hóa chất, không thể chạy lượt thứ 5 trong một chu kỳ, không thể nhập quá 110 lame một lượt, và người thay, người chạy, người đánh giá luôn được ghi theo tài khoản đang đăng nhập (không ai ghi thay tên người khác được). Nếu thay hóa chất khi chu kỳ chưa chạy đủ lượt, phần mềm bắt ghi lý do.

Mọi thao tác thêm, sửa, xóa đều tự động lưu vào Nhật ký thao tác (giá trị cũ và mới, ai làm, lúc nào). Nhật ký không sửa, xóa được từ phần mềm.

## Vai trò

| Vai trò | Được làm |
|---|---|
| Kỹ thuật viên | Thay hóa chất, ghi nhận lượt chạy, sửa lượt chạy do mình ghi |
| Người đọc lame | Đánh giá Đạt / Không đạt và ghi chú |
| Quản trị | Làm được tất cả, cấp quyền người dùng, sửa định mức, xóa lượt chạy, xem nhật ký |

Ai đã được cấp quyền cũng xem được Tổng quan, Lịch sử và Báo cáo.

## Triển khai

### Bước 1. Supabase

1. Dùng dự án Supabase mới, hoặc dùng chung dự án của phần mềm kho (mọi bảng đều có tiền tố `xlm_` nên không đụng bảng kho; sau này muốn liên thông kho cũng dễ hơn).
2. Vào **SQL Editor**, dán toàn bộ nội dung file `supabase/schema.sql` và bấm **Run**.
3. Vào **Authentication > Users > Add user > Create new user**, tạo tài khoản email của bạn (tích chọn Auto Confirm User).
4. Quay lại **SQL Editor**, chạy câu lệnh sau (thay email và họ tên) để bạn thành quản trị viên đầu tiên:

```sql
insert into public.xlm_nguoi_dung (user_id, email, ho_ten, vai_tro)
select id, email, 'Họ tên của bạn', 'quan_tri' from auth.users
where email = 'email-cua-ban@example.com';
```

5. Vào **Authentication > Sign In / Providers**, tắt **Allow new users to sign up** để người ngoài không tự đăng ký được.

### Bước 2. GitHub

Tạo một kho (repository) mới, để chế độ **Private**, rồi đẩy toàn bộ thư mục này lên. File `.env` đã nằm trong `.gitignore` nên khóa kết nối không bị đẩy lên GitHub.

### Bước 3. Vercel

1. **Add New > Project**, chọn kho GitHub vừa tạo. Vercel tự nhận ra đây là dự án Vite.
2. Mục **Environment Variables**, thêm hai biến (lấy trong Supabase > Project Settings > API):
   - `VITE_SUPABASE_URL`: Project URL
   - `VITE_SUPABASE_ANON_KEY`: khóa `anon` `public`
3. Bấm **Deploy**. Xong sẽ có đường link dạng `https://ten-du-an.vercel.app`.

### Bước 4. Hoàn tất cấu hình đăng nhập

Vào Supabase **Authentication > URL Configuration**, điền **Site URL** là link Vercel ở bước 3 và thêm link đó vào **Redirect URLs**. Bước này để chức năng Quên mật khẩu gửi email đúng địa chỉ.

## Thêm người dùng cho khoa

1. Supabase **Authentication > Users > Add user**: tạo tài khoản bằng email và mật khẩu tạm của người đó.
2. Đăng nhập phần mềm bằng tài khoản quản trị, vào **Quản trị > Người dùng**, nhập email, họ tên, chọn vai trò, bấm **Cấp quyền**.
3. Gửi link phần mềm và mật khẩu tạm cho người đó. Họ có thể đổi mật khẩu bằng chức năng Quên mật khẩu.

Muốn ngưng quyền một người, bấm **Khóa tài khoản** trong danh sách; lịch sử thao tác của họ vẫn được giữ.

## Chạy thử trên máy

```bash
npm install
cp .env.example .env   # rồi điền URL và khóa Supabase vào .env
npm run dev
```

## Lưu ý về dữ liệu

Máy chủ Supabase và Vercel đặt ở nước ngoài (nên chọn khu vực Singapore khi tạo dự án Supabase). Trong giai đoạn dùng thử, chỉ nhập số liệu vận hành máy và mã mẫu, không nhập họ tên hay thông tin nhận dạng của người được giám định. Khi trung tâm chuyển sang máy chủ nội bộ, có thể cài Supabase tự vận hành (self-hosted) hoặc PostgreSQL, chạy lại file `schema.sql` và giữ nguyên phần giao diện.

## Cấu trúc thư mục

```
supabase/schema.sql      Cơ sở dữ liệu, quy tắc nghiệp vụ, phân quyền, nhật ký
src/App.jsx              Đăng nhập, phân quyền, điều hướng
src/pages/TongQuan.jsx   Chu kỳ hiện tại, thay hóa chất, ghi nhận lượt chạy
src/pages/DanhGia.jsx    Đánh giá chất lượng lame
src/pages/LichSu.jsx     Lịch sử theo tháng, xuất CSV
src/pages/BaoCao.jsx     Báo cáo theo khoảng ngày, xuất CSV
src/pages/QuanTri.jsx    Người dùng, định mức, nhật ký thao tác
src/components/          Khay lame, hộp thoại, chi tiết lượt chạy
```
