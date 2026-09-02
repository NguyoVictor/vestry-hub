begin;
update public.tenants
set daraja_consumer_key=null,
    daraja_consumer_secret=null,
    daraja_passkey=null,
    updated_at=now()
where daraja_consumer_key is not null
   or daraja_consumer_secret is not null
   or daraja_passkey is not null;
commit;;
