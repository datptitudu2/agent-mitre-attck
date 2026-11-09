-- ==============================================================================
-- ATT&CK Lab — Seed Allowlist Mẫu
-- Thay email bên dưới bằng email thật của bạn và các thành viên trong nhóm,
-- sau đó chạy trong Supabase SQL Editor TRƯỚC khi tạo user trong mục Authentication.
-- ==============================================================================

insert into public.allowed_emails (email, role, note)
values
  ('admin@example.com', 'admin', 'Quản trị viên đầu tiên của ATT&CK Lab'),
  ('member1@example.com', 'member', 'Thành viên nhóm bảo mật')
on conflict (email) do update
  set role = excluded.role,
      note = excluded.note;
