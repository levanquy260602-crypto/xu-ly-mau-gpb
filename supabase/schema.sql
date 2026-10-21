-- =====================================================================
-- PHẦN MỀM QUẢN LÝ XỬ LÝ MẪU - KHOA GIẢI PHẪU BỆNH
-- Chạy toàn bộ file này một lần trong Supabase > SQL Editor.
-- Mọi bảng đều có tiền tố xlm_ để không đụng bảng của phần mềm kho
-- nếu dùng chung một dự án Supabase.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. BẢNG
-- ---------------------------------------------------------------------

-- Người dùng của phần mềm (gắn với tài khoản đăng nhập Supabase Auth)
create table if not exists public.xlm_nguoi_dung (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  ho_ten      text not null,
  vai_tro     text not null default 'ktv'
              check (vai_tro in ('ktv', 'doc_lame', 'quan_tri')),
  hoat_dong   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Cấu hình chung (chỉ có 1 dòng, id = 1)
create table if not exists public.xlm_cau_hinh (
  id              smallint primary key default 1 check (id = 1),
  con_lit         numeric(6,2) not null default 13,
  xylen_lit       numeric(6,2) not null default 6,
  sap_kg          numeric(6,2) not null default 5,
  lame_toi_da     integer not null default 110 check (lame_toi_da > 0),
  so_luot_chu_ky  integer not null default 4 check (so_luot_chu_ky > 0),
  updated_at      timestamptz not null default now()
);
insert into public.xlm_cau_hinh (id) values (1) on conflict (id) do nothing;

-- Mỗi lần thay hóa chất = một chu kỳ
create table if not exists public.xlm_chu_ky (
  id              bigint generated always as identity primary key,
  ngay_thay       timestamptz not null default now(),
  nguoi_thay      uuid not null default auth.uid() references public.xlm_nguoi_dung(user_id),
  con_lit         numeric(6,2) not null,
  xylen_lit       numeric(6,2) not null,
  sap_kg          numeric(6,2) not null,
  so_luot_toi_da  integer not null,
  lame_toi_da     integer not null,
  trang_thai      text not null default 'dang_dung'
                  check (trang_thai in ('dang_dung', 'da_dong')),
  ghi_chu         text,
  created_at      timestamptz not null default now()
);

-- Mỗi lần chạy máy
create table if not exists public.xlm_luot_chay (
  id          bigint generated always as identity primary key,
  chu_ky_id   bigint not null references public.xlm_chu_ky(id) on delete restrict,
  lan_thu     integer not null,
  ngay        date not null,
  ca          text not null check (ca in ('sang', 'chieu')),
  loai_lich   text not null default 'thuong_quy'
              check (loai_lich in ('thuong_quy', 'tang_ca')),
  so_lame     integer not null check (so_lame > 0),
  nguoi_chay  uuid not null default auth.uid() references public.xlm_nguoi_dung(user_id),
  ghi_chu     text,
  created_at  timestamptz not null default now()
);
create index if not exists xlm_luot_chay_chu_ky_idx on public.xlm_luot_chay(chu_ky_id);
create index if not exists xlm_luot_chay_ngay_idx on public.xlm_luot_chay(ngay);

-- Đánh giá chất lượng lame của từng lượt chạy (Đạt / Không đạt + ghi chú)
create table if not exists public.xlm_danh_gia (
  id              bigint generated always as identity primary key,
  luot_chay_id    bigint not null unique references public.xlm_luot_chay(id) on delete cascade,
  ket_qua         text not null check (ket_qua in ('dat', 'khong_dat')),
  ghi_chu         text,
  nguoi_danh_gia  uuid not null default auth.uid() references public.xlm_nguoi_dung(user_id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Nhật ký thao tác (không ai sửa, xóa được từ phần mềm)
create table if not exists public.xlm_nhat_ky (
  id          bigint generated always as identity primary key,
  bang        text not null,
  ban_ghi_id  text,
  hanh_dong   text not null,
  du_lieu_cu  jsonb,
  du_lieu_moi jsonb,
  nguoi       uuid,
  thoi_diem   timestamptz not null default now()
);
create index if not exists xlm_nhat_ky_thoi_diem_idx on public.xlm_nhat_ky(thoi_diem desc);

-- ---------------------------------------------------------------------
-- 2. HÀM HỖ TRỢ PHÂN QUYỀN
-- ---------------------------------------------------------------------

-- Vai trò của người đang đăng nhập (null nếu chưa được cấp quyền hoặc đã khóa)
create or replace function public.xlm_vai_tro()
returns text
language sql stable security definer set search_path = public
as $$
  select vai_tro from public.xlm_nguoi_dung
  where user_id = auth.uid() and hoat_dong = true
$$;

-- ---------------------------------------------------------------------
-- 3. QUY TẮC NGHIỆP VỤ (kiểm soát ngay trong cơ sở dữ liệu)
-- ---------------------------------------------------------------------

-- Khi thay hóa chất: lấy định mức từ cấu hình, đóng chu kỳ cũ
create or replace function public.xlm_truoc_tao_chu_ky()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare ch public.xlm_cau_hinh;
begin
  select * into ch from public.xlm_cau_hinh where id = 1;
  new.con_lit        := ch.con_lit;
  new.xylen_lit      := ch.xylen_lit;
  new.sap_kg         := ch.sap_kg;
  new.so_luot_toi_da := ch.so_luot_chu_ky;
  new.lame_toi_da    := ch.lame_toi_da;
  new.nguoi_thay     := auth.uid();
  new.ngay_thay      := now();
  new.trang_thai     := 'dang_dung';

  update public.xlm_chu_ky set trang_thai = 'da_dong'
  where trang_thai = 'dang_dung';
  return new;
end $$;

drop trigger if exists xlm_truoc_tao_chu_ky on public.xlm_chu_ky;
create trigger xlm_truoc_tao_chu_ky
before insert on public.xlm_chu_ky
for each row execute function public.xlm_truoc_tao_chu_ky();

-- Khi ghi nhận lượt chạy: gắn vào chu kỳ đang dùng, đánh số lượt,
-- chặn quá số lame tối đa và quá số lượt của chu kỳ
create or replace function public.xlm_truoc_tao_luot_chay()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  ck public.xlm_chu_ky;
  da_chay integer;
  lan_cuoi integer;
begin
  select * into ck from public.xlm_chu_ky
  where trang_thai = 'dang_dung'
  order by ngay_thay desc limit 1
  for update;

  if ck.id is null then
    raise exception 'Chưa có chu kỳ hóa chất nào. Hãy bấm "Thay hóa chất" trước khi ghi nhận lượt chạy.';
  end if;

  select count(*), coalesce(max(lan_thu), 0) into da_chay, lan_cuoi
  from public.xlm_luot_chay where chu_ky_id = ck.id;

  if da_chay >= ck.so_luot_toi_da then
    raise exception 'Chu kỳ hóa chất hiện tại đã chạy đủ % lượt. Cần thay hóa chất trước khi chạy tiếp.', ck.so_luot_toi_da;
  end if;

  if new.so_lame > ck.lame_toi_da then
    raise exception 'Mỗi lượt chạy tối đa % lame.', ck.lame_toi_da;
  end if;

  new.chu_ky_id  := ck.id;
  new.lan_thu    := lan_cuoi + 1;
  new.nguoi_chay := auth.uid();
  return new;
end $$;

drop trigger if exists xlm_truoc_tao_luot_chay on public.xlm_luot_chay;
create trigger xlm_truoc_tao_luot_chay
before insert on public.xlm_luot_chay
for each row execute function public.xlm_truoc_tao_luot_chay();

-- Khi sửa lượt chạy: không cho đổi chu kỳ, số thứ tự, người chạy; vẫn chặn quá số lame
create or replace function public.xlm_truoc_sua_luot_chay()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare toi_da integer;
begin
  new.chu_ky_id  := old.chu_ky_id;
  new.lan_thu    := old.lan_thu;
  new.nguoi_chay := old.nguoi_chay;
  new.created_at := old.created_at;
  select lame_toi_da into toi_da from public.xlm_chu_ky where id = old.chu_ky_id;
  if new.so_lame > toi_da then
    raise exception 'Mỗi lượt chạy tối đa % lame.', toi_da;
  end if;
  return new;
end $$;

drop trigger if exists xlm_truoc_sua_luot_chay on public.xlm_luot_chay;
create trigger xlm_truoc_sua_luot_chay
before update on public.xlm_luot_chay
for each row execute function public.xlm_truoc_sua_luot_chay();

-- Đánh giá: luôn ghi người đánh giá là người đang đăng nhập
create or replace function public.xlm_truoc_luu_danh_gia()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  new.nguoi_danh_gia := auth.uid();
  new.updated_at := now();
  if tg_op = 'UPDATE' then
    new.luot_chay_id := old.luot_chay_id;
    new.created_at := old.created_at;
  end if;
  return new;
end $$;

drop trigger if exists xlm_truoc_luu_danh_gia on public.xlm_danh_gia;
create trigger xlm_truoc_luu_danh_gia
before insert or update on public.xlm_danh_gia
for each row execute function public.xlm_truoc_luu_danh_gia();

-- ---------------------------------------------------------------------
-- 4. NHẬT KÝ THAO TÁC (tự động cho mọi thay đổi)
-- ---------------------------------------------------------------------
create or replace function public.xlm_ghi_nhat_ky()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.xlm_nhat_ky (bang, ban_ghi_id, hanh_dong, du_lieu_cu, du_lieu_moi, nguoi)
  values (
    tg_table_name,
    coalesce((to_jsonb(new) ->> 'id'), (to_jsonb(old) ->> 'id'),
             (to_jsonb(new) ->> 'user_id'), (to_jsonb(old) ->> 'user_id')),
    tg_op,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end,
    auth.uid()
  );
  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  foreach t in array array['xlm_chu_ky', 'xlm_luot_chay', 'xlm_danh_gia', 'xlm_nguoi_dung', 'xlm_cau_hinh']
  loop
    execute format('drop trigger if exists xlm_nhat_ky_%1$s on public.%1$I', t);
    execute format(
      'create trigger xlm_nhat_ky_%1$s after insert or update or delete on public.%1$I
       for each row execute function public.xlm_ghi_nhat_ky()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 5. HÀM CHO QUẢN TRỊ: cấp quyền cho một tài khoản đã có trong Supabase Auth
-- ---------------------------------------------------------------------
create or replace function public.xlm_cap_quyen(p_email text, p_ho_ten text, p_vai_tro text)
returns void
language plpgsql security definer set search_path = public
as $$
declare uid uuid;
begin
  if public.xlm_vai_tro() is distinct from 'quan_tri' then
    raise exception 'Chỉ quản trị viên mới được cấp quyền.';
  end if;
  select id into uid from auth.users where lower(email) = lower(trim(p_email));
  if uid is null then
    raise exception 'Không tìm thấy tài khoản %. Hãy tạo tài khoản này trong Supabase (Authentication > Users > Add user) trước.', p_email;
  end if;
  insert into public.xlm_nguoi_dung (user_id, email, ho_ten, vai_tro, hoat_dong)
  values (uid, lower(trim(p_email)), trim(p_ho_ten), p_vai_tro, true)
  on conflict (user_id) do update
    set ho_ten = excluded.ho_ten, vai_tro = excluded.vai_tro, hoat_dong = true;
end $$;

-- ---------------------------------------------------------------------
-- 6. PHÂN QUYỀN THEO DÒNG (RLS)
--    ktv       : thay hóa chất, ghi nhận và sửa lượt chạy của mình
--    doc_lame  : đánh giá chất lượng lame
--    quan_tri  : làm được tất cả, quản lý người dùng, cấu hình, xem nhật ký
-- ---------------------------------------------------------------------
alter table public.xlm_nguoi_dung enable row level security;
alter table public.xlm_cau_hinh   enable row level security;
alter table public.xlm_chu_ky     enable row level security;
alter table public.xlm_luot_chay  enable row level security;
alter table public.xlm_danh_gia   enable row level security;
alter table public.xlm_nhat_ky    enable row level security;

revoke all on public.xlm_nguoi_dung, public.xlm_cau_hinh, public.xlm_chu_ky,
              public.xlm_luot_chay, public.xlm_danh_gia, public.xlm_nhat_ky from anon;
grant select, insert, update, delete on public.xlm_nguoi_dung, public.xlm_cau_hinh,
      public.xlm_chu_ky, public.xlm_luot_chay, public.xlm_danh_gia to authenticated;
grant select on public.xlm_nhat_ky to authenticated;
revoke execute on function public.xlm_cap_quyen(text, text, text) from anon, public;
grant execute on function public.xlm_cap_quyen(text, text, text) to authenticated;

-- Người dùng
drop policy if exists "xlm_nd_xem" on public.xlm_nguoi_dung;
create policy "xlm_nd_xem" on public.xlm_nguoi_dung for select to authenticated
  using (user_id = auth.uid() or public.xlm_vai_tro() is not null);
drop policy if exists "xlm_nd_sua" on public.xlm_nguoi_dung;
create policy "xlm_nd_sua" on public.xlm_nguoi_dung for update to authenticated
  using (public.xlm_vai_tro() = 'quan_tri') with check (public.xlm_vai_tro() = 'quan_tri');

-- Cấu hình
drop policy if exists "xlm_ch_xem" on public.xlm_cau_hinh;
create policy "xlm_ch_xem" on public.xlm_cau_hinh for select to authenticated
  using (public.xlm_vai_tro() is not null);
drop policy if exists "xlm_ch_sua" on public.xlm_cau_hinh;
create policy "xlm_ch_sua" on public.xlm_cau_hinh for update to authenticated
  using (public.xlm_vai_tro() = 'quan_tri') with check (public.xlm_vai_tro() = 'quan_tri');

-- Chu kỳ hóa chất
drop policy if exists "xlm_ck_xem" on public.xlm_chu_ky;
create policy "xlm_ck_xem" on public.xlm_chu_ky for select to authenticated
  using (public.xlm_vai_tro() is not null);
drop policy if exists "xlm_ck_tao" on public.xlm_chu_ky;
create policy "xlm_ck_tao" on public.xlm_chu_ky for insert to authenticated
  with check (public.xlm_vai_tro() in ('ktv', 'quan_tri'));
drop policy if exists "xlm_ck_sua" on public.xlm_chu_ky;
create policy "xlm_ck_sua" on public.xlm_chu_ky for update to authenticated
  using (public.xlm_vai_tro() = 'quan_tri')
  with check (public.xlm_vai_tro() = 'quan_tri');

-- Lượt chạy
drop policy if exists "xlm_lc_xem" on public.xlm_luot_chay;
create policy "xlm_lc_xem" on public.xlm_luot_chay for select to authenticated
  using (public.xlm_vai_tro() is not null);
drop policy if exists "xlm_lc_tao" on public.xlm_luot_chay;
create policy "xlm_lc_tao" on public.xlm_luot_chay for insert to authenticated
  with check (public.xlm_vai_tro() in ('ktv', 'quan_tri'));
drop policy if exists "xlm_lc_sua" on public.xlm_luot_chay;
create policy "xlm_lc_sua" on public.xlm_luot_chay for update to authenticated
  using (public.xlm_vai_tro() = 'quan_tri' or (public.xlm_vai_tro() = 'ktv' and nguoi_chay = auth.uid()))
  with check (public.xlm_vai_tro() = 'quan_tri' or (public.xlm_vai_tro() = 'ktv' and nguoi_chay = auth.uid()));
drop policy if exists "xlm_lc_xoa" on public.xlm_luot_chay;
create policy "xlm_lc_xoa" on public.xlm_luot_chay for delete to authenticated
  using (public.xlm_vai_tro() = 'quan_tri');

-- Đánh giá
drop policy if exists "xlm_dg_xem" on public.xlm_danh_gia;
create policy "xlm_dg_xem" on public.xlm_danh_gia for select to authenticated
  using (public.xlm_vai_tro() is not null);
drop policy if exists "xlm_dg_tao" on public.xlm_danh_gia;
create policy "xlm_dg_tao" on public.xlm_danh_gia for insert to authenticated
  with check (public.xlm_vai_tro() in ('doc_lame', 'quan_tri'));
drop policy if exists "xlm_dg_sua" on public.xlm_danh_gia;
create policy "xlm_dg_sua" on public.xlm_danh_gia for update to authenticated
  using (public.xlm_vai_tro() in ('doc_lame', 'quan_tri'))
  with check (public.xlm_vai_tro() in ('doc_lame', 'quan_tri'));

-- Nhật ký: chỉ quản trị xem, không ai ghi/sửa/xóa trực tiếp
drop policy if exists "xlm_nk_xem" on public.xlm_nhat_ky;
create policy "xlm_nk_xem" on public.xlm_nhat_ky for select to authenticated
  using (public.xlm_vai_tro() = 'quan_tri');

-- =====================================================================
-- 7. TẠO QUẢN TRỊ VIÊN ĐẦU TIÊN
--    Bước 1: Authentication > Users > Add user > tạo tài khoản email của bạn.
--    Bước 2: sửa email + họ tên bên dưới, bỏ dấu -- ở đầu 3 dòng rồi chạy riêng.
-- =====================================================================
-- insert into public.xlm_nguoi_dung (user_id, email, ho_ten, vai_tro)
-- select id, email, 'Họ tên của bạn', 'quan_tri' from auth.users
-- where email = 'email-cua-ban@example.com';
