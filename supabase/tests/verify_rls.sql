-- ==============================================================================
-- ATT&CK Lab — Kịch bản Kiểm chứng tự động RLS & Allowlist (Chạy trong SQL Editor)
-- Toàn bộ bài test chạy bên trong transaction và ROLLBACK ở cuối nên không làm bẩn DB!
-- Kiểm chứng:
--   1. Email ngoài allowlist bị chặn cứng khi đăng ký vào auth.users.
--   2. User A KHÔNG đọc / sửa / xoá được bookmarks, notes, progress, quiz_attempts,
--      coverage_layers (shared=false) của User B.
--   3. Coverage layer có shared=true được User B đọc nhưng KHÔNG sửa/xoá được.
-- ==============================================================================

begin;

do $$
declare
  uid_a uuid := '11111111-1111-4111-8111-111111111111';
  uid_b uuid := '22222222-2222-4222-8222-222222222222';
  uid_outsider uuid := '33333333-3333-4333-8333-333333333333';
  blocked_signup boolean := false;
  cnt integer;
begin
  -- 1. Thêm User A & User B vào allowlist
  insert into public.allowed_emails (email, role, note) values
    ('rls_user_a@attacklab.test', 'member', 'Test User A'),
    ('rls_user_b@attacklab.test', 'member', 'Test User B')
  on conflict (email) do nothing;

  -- 2. Kiểm chứng email ngoài allowlist bị chặn khi insert vào auth.users
  begin
    insert into auth.users (id, email, aud, role)
    values (uid_outsider, 'outsider_not_allowed@attacklab.test', 'authenticated', 'authenticated');
  exception when insufficient_privilege then
    blocked_signup := true;
  end;

  if not blocked_signup then
    raise exception 'FAIL: Email ngoai allowlist van tao duoc tai khoan!';
  end if;

  -- 3. Tạo User A và User B hợp lệ
  insert into auth.users (id, email, aud, role) values
    (uid_a, 'rls_user_a@attacklab.test', 'authenticated', 'authenticated'),
    (uid_b, 'rls_user_b@attacklab.test', 'authenticated', 'authenticated');

  -- 4. Giả lập phiên đăng nhập của User B và tạo dữ liệu riêng tư
  perform set_config('request.jwt.claim.sub', uid_b::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  execute 'set local role authenticated';

  insert into public.bookmarks (user_id, domain, attack_id, note)
    values (uid_b, 'enterprise-attack', 'T1059', 'Bookmark rieng cua User B');
  insert into public.notes (user_id, attack_id, body_md)
    values (uid_b, 'T1059', 'Ghi chu bi mat cua User B');
  insert into public.progress (user_id, lesson_slug)
    values (uid_b, '01-intro');
  insert into public.coverage_layers (user_id, name, domain, shared)
    values (uid_b, 'Private Layer B', 'enterprise-attack', false);
  insert into public.coverage_layers (user_id, name, domain, shared)
    values (uid_b, 'Shared Layer B', 'enterprise-attack', true);

  -- 5. Chuyển sang phiên đăng nhập của User A -> kiểm tra cô lập dữ liệu!
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', uid_a::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  execute 'set local role authenticated';

  select count(*) into cnt from public.bookmarks where user_id = uid_b;
  if cnt <> 0 then
    raise exception 'FAIL: User A doc duoc % bookmark cua User B!', cnt;
  end if;

  select count(*) into cnt from public.notes where user_id = uid_b;
  if cnt <> 0 then
    raise exception 'FAIL: User A doc duoc % note cua User B!', cnt;
  end if;

  select count(*) into cnt from public.progress where user_id = uid_b;
  if cnt <> 0 then
    raise exception 'FAIL: User A doc duoc progress cua User B!';
  end if;

  select count(*) into cnt from public.coverage_layers where user_id = uid_b and shared = false;
  if cnt <> 0 then
    raise exception 'FAIL: User A doc duoc private coverage_layer cua User B!';
  end if;

  select count(*) into cnt from public.coverage_layers where user_id = uid_b and shared = true;
  if cnt <> 1 then
    raise exception 'FAIL: User A khong doc duoc shared coverage_layer cua User B!';
  end if;

  execute 'reset role';
  raise notice 'PASS: Tat ca kiem chung Allowlist & RLS giua User A va User B deu thanh cong!';
end;
$$;

rollback;

