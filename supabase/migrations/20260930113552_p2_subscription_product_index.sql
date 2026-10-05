-- P2 B4: covering index for the subscription product foreign key.
create index if not exists subscription_payment_attempts_product_code_idx
  on public.subscription_payment_attempts(product_code);
