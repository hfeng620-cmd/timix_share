-- Email notification triggers for Timix观察站.
-- Requires: pg_net extension enabled in Supabase Dashboard.
--          Edge Function send-email deployed.
--          RESEND_API_KEY secret set.

-- 1. Enable pg_net (run in Supabase Dashboard → Extensions, or as superuser)
-- create extension if not exists pg_net;

-- 2. Function to call the Edge Function for email sending
create or replace function public.send_email_notification(
  recipient_email text,
  subject text,
  html_body text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Call the Edge Function via pg_net (requires pg_net extension)
  -- This is async — the HTTP call fires and we don't wait for response
  perform net.http_post(
    url := 'https://svksgdsuquhkwyliavfn.supabase.co/functions/v1/send-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('supabase.service_role_key', true)
    ),
    body := jsonb_build_object(
      'to', recipient_email,
      'subject', subject,
      'html', html_body
    )
  );
end;
$$;

-- 3. Trigger: send email on new reply (batched — only sends if user hasn't been emailed in last 30 min)
create or replace function public.email_on_reply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  post_author_id uuid;
  post_title text;
  post_id_val uuid;
  replier_name text;
  author_email text;
  last_email timestamptz;
begin
  -- Find the post author
  select p.author_id, p.title, p.id
  into post_author_id, post_title, post_id_val
  from public.forum_posts p
  where p.id = new.post_id;

  -- Don't email self-replies
  if post_author_id = new.author_id then
    return new;
  end if;

  -- Get author email from auth.users (only works with service_role)
  select u.email into author_email
  from auth.users u
  where u.id = post_author_id;

  if author_email is null then
    return new;
  end if;

  -- Rate-limit: only send one email per 30 minutes per user
  select max(created_at) into last_email
  from public.notifications
  where user_id = post_author_id
    and type = 'new_reply'
    and created_at > now() - interval '30 minutes';

  if last_email is not null then
    return new; -- Already notified recently
  end if;

  -- Get replier name
  select pr.display_name into replier_name
  from public.forum_profiles pr
  where pr.id = new.author_id;

  -- Send the email (async via pg_net)
  perform public.send_email_notification(
    recipient_email := author_email,
    subject := '🔔 ' || replier_name || ' 回复了你的帖子',
    html_body := format(
      '<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #2563EB;">Timix 观察站</h2>
        <p>%s 在「%s」中回复了你：</p>
        <blockquote style="border-left: 3px solid #E1E6EF; margin: 16px 0; padding: 8px 16px; color: #6B7280;">
          %s
        </blockquote>
        <a href="https://hfeng620-cmd.github.io/timin_api_test_and_forum/community" style="display: inline-block; background: #2563EB; color: white; padding: 12px 24px; border-radius: 999px; text-decoration: none; font-weight: bold;">
          查看回复
        </a>
        <p style="margin-top: 24px; font-size: 12px; color: #9CA3AF;">
          此邮件由 Timix 观察站自动发送。你可以在个人设置中关闭邮件通知。
        </p>
      </div>',
      replier_name,
      coalesce(post_title, '讨论'),
      left(new.body, 300)
    )
  );

  return new;
end;
$$;

drop trigger if exists on_reply_send_email on public.forum_replies;
create trigger on_reply_send_email
  after insert on public.forum_replies
  for each row execute function public.email_on_reply();
