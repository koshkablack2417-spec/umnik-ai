alter table public.user_settings
  drop constraint if exists user_settings_provider_check;

update public.user_settings
set provider = 'openai'
where provider is distinct from 'openai';

alter table public.user_settings
  alter column provider set default 'openai';

alter table public.user_settings
  add constraint user_settings_provider_check check (provider = 'openai');
