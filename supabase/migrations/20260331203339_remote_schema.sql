


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."order_status" AS ENUM (
    'aguardando_aceite',
    'em_preparo',
    'pronto_para_retirada',
    'finalizado',
    'recusado'
);


ALTER TYPE "public"."order_status" OWNER TO "postgres";


CREATE TYPE "public"."payment_method_type" AS ENUM (
    'pix',
    'credit_card',
    'debit_card'
);


ALTER TYPE "public"."payment_method_type" OWNER TO "postgres";


CREATE TYPE "public"."payment_status" AS ENUM (
    'pending',
    'approved',
    'failed',
    'expired',
    'cancelled',
    'refunded'
);


ALTER TYPE "public"."payment_status" OWNER TO "postgres";


CREATE TYPE "public"."refund_status" AS ENUM (
    'none',
    'pendente',
    'reembolsado',
    'falhou'
);


ALTER TYPE "public"."refund_status" OWNER TO "postgres";


CREATE TYPE "public"."service_mode_type" AS ENUM (
    'counter_pickup'
);


ALTER TYPE "public"."service_mode_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."assign_store_order_number"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if new.order_number is null or new.order_number <= 0 then
    perform pg_advisory_xact_lock(hashtext(new.store_id::text), 1);

    select coalesce(max(o.order_number), 0) + 1
      into new.order_number
    from public.orders o
    where o.store_id = new.store_id;
  end if;

  new.updated_at := now();
  return new;
end;
$$;


ALTER FUNCTION "public"."assign_store_order_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_order_from_checkout_session"("p_checkout_session_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_session public.checkout_sessions%rowtype;
  v_order_id uuid;
  v_item record;
begin
  select *
    into v_session
    from public.checkout_sessions
   where id = p_checkout_session_id
   for update;

  if not found then
    raise exception 'checkout_session não encontrada';
  end if;

  if v_session.payment_status <> 'approved' then
    raise exception 'checkout_session ainda não está com pagamento aprovado';
  end if;

  select id
    into v_order_id
    from public.orders
   where checkout_session_id = v_session.id;

  if v_order_id is not null then
    return v_order_id;
  end if;

  if exists (
    select 1
      from public.checkout_session_items csi
     where csi.checkout_session_id = v_session.id
       and csi.product_id is null
  ) then
    raise exception 'checkout_session contém item sem product_id válido';
  end if;

  if exists (
    select 1
      from public.checkout_session_items csi
      join public.products p on p.id = csi.product_id
     where csi.checkout_session_id = v_session.id
       and p.store_id <> v_session.store_id
  ) then
    raise exception 'checkout_session contém item de outra loja';
  end if;

  for v_item in
    select
      p.id as product_id,
      p.name as product_name,
      p.store_id,
      p.track_stock,
      p.stock_quantity,
      p.is_active,
      p.is_available,
      q.requested_quantity
    from public.products p
    join (
      select
        csi.product_id,
        sum(csi.quantity)::integer as requested_quantity
      from public.checkout_session_items csi
      where csi.checkout_session_id = v_session.id
        and csi.product_id is not null
      group by csi.product_id
    ) q
      on q.product_id = p.id
    order by p.id
    for update of p
  loop
    if v_item.store_id <> v_session.store_id then
      raise exception 'produto "%" não pertence à loja do checkout', v_item.product_name;
    end if;

    if v_item.is_active = false then
      raise exception 'produto "%" está oculto no cardápio', v_item.product_name;
    end if;

    if v_item.is_available = false then
      raise exception 'produto "%" está indisponível no momento', v_item.product_name;
    end if;

    if v_item.track_stock = true and v_item.stock_quantity < v_item.requested_quantity then
      raise exception
        'estoque insuficiente para "%" (disponível: %, solicitado: %)',
        v_item.product_name,
        v_item.stock_quantity,
        v_item.requested_quantity;
    end if;
  end loop;

  insert into public.orders (
    store_id,
    checkout_session_id,
    pickup_code,
    customer_name,
    customer_phone,
    order_notes,
    status,
    payment_status,
    payment_method,
    service_mode,
    subtotal_amount,
    total_amount,
    payment_gateway,
    external_payment_id,
    external_preference_id,
    paid_at
  )
  values (
    v_session.store_id,
    v_session.id,
    '',
    v_session.customer_name,
    v_session.customer_phone,
    v_session.order_notes,
    'paid',
    'approved',
    v_session.payment_method,
    v_session.service_mode,
    v_session.subtotal_amount,
    v_session.total_amount,
    v_session.payment_gateway,
    v_session.external_payment_id,
    v_session.external_preference_id,
    coalesce(v_session.approved_at, now())
  )
  returning id into v_order_id;

  insert into public.order_items (
    order_id,
    product_id,
    product_name_snapshot,
    unit_price,
    quantity,
    line_total
  )
  select
    v_order_id,
    csi.product_id,
    csi.product_name_snapshot,
    csi.unit_price,
    csi.quantity,
    csi.line_total
  from public.checkout_session_items csi
  where csi.checkout_session_id = v_session.id;

  update public.products p
     set stock_quantity = p.stock_quantity - q.requested_quantity,
         is_available = case
           when p.track_stock = true and (p.stock_quantity - q.requested_quantity) <= 0 then false
           when p.track_stock = true and (p.stock_quantity - q.requested_quantity) > 0 then true
           else p.is_available
         end,
         updated_at = now()
    from (
      select
        csi.product_id,
        sum(csi.quantity)::integer as requested_quantity
      from public.checkout_session_items csi
      where csi.checkout_session_id = v_session.id
        and csi.product_id is not null
      group by csi.product_id
    ) q
   where p.id = q.product_id
     and p.track_stock = true;

  perform public.recalculate_order_totals(v_order_id);

  return v_order_id;
end;
$$;


ALTER FUNCTION "public"."create_order_from_checkout_session"("p_checkout_session_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."finalize_order_cancellation"("p_order_id" "uuid", "p_payment_status" "public"."payment_status", "p_reason" "text" DEFAULT NULL::"text", "p_external_refund_id" "text" DEFAULT NULL::"text", "p_refund_amount" numeric DEFAULT NULL::numeric) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_order public.orders%rowtype;
begin
  if p_payment_status not in ('cancelled', 'refunded') then
    raise exception 'payment_status inválido para cancelamento final';
  end if;

  select *
    into v_order
    from public.orders
   where id = p_order_id
   for update;

  if not found then
    raise exception 'pedido não encontrado';
  end if;

  if v_order.stock_reverted_at is null then
    update public.products p
       set stock_quantity = p.stock_quantity + q.returned_quantity,
           is_available = case
             when p.track_stock = true and (p.stock_quantity + q.returned_quantity) > 0 then true
             else p.is_available
           end,
           updated_at = now()
      from (
        select
          oi.product_id,
          sum(oi.quantity)::integer as returned_quantity
        from public.order_items oi
        where oi.order_id = p_order_id
          and oi.product_id is not null
        group by oi.product_id
      ) q
     where p.id = q.product_id
       and p.track_stock = true;
  end if;

  update public.orders
     set status = 'cancelled',
         payment_status = p_payment_status,
         cancelled_at = coalesce(cancelled_at, now()),
         cancellation_reason = coalesce(p_reason, cancellation_reason),
         refunded_at = case
           when p_payment_status = 'refunded' then coalesce(refunded_at, now())
           else refunded_at
         end,
         refund_amount = case
           when p_payment_status = 'refunded' then coalesce(p_refund_amount, total_amount)
           else refund_amount
         end,
         external_refund_id = coalesce(p_external_refund_id, external_refund_id),
         stock_reverted_at = coalesce(stock_reverted_at, now()),
         updated_at = now()
   where id = p_order_id;
end;
$$;


ALTER FUNCTION "public"."finalize_order_cancellation"("p_order_id" "uuid", "p_payment_status" "public"."payment_status", "p_reason" "text", "p_external_refund_id" "text", "p_refund_amount" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_pickup_code"("p_store_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_next integer;
begin
  insert into public.store_counters (store_id, last_pickup_code)
  values (p_store_id, 0)
  on conflict (store_id) do nothing;

  update public.store_counters
     set last_pickup_code = last_pickup_code + 1,
         updated_at = now()
   where store_id = p_store_id
   returning last_pickup_code into v_next;

  return lpad(v_next::text, 4, '0');
end;
$$;


ALTER FUNCTION "public"."generate_pickup_code"("p_store_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_latest_ready_order_for_store"("p_slug" "text") RETURNS TABLE("order_id" "uuid", "display_code" "text", "ready_at" timestamp with time zone)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    o.id as order_id,
    o.display_code,
    o.ready_at
  from public.orders o
  join public.stores s on s.id = o.store_id
  where s.slug = p_slug
    and o.status = 'pronto_para_retirada'
  order by o.ready_at desc nulls last, o.created_at desc
  limit 1
$$;


ALTER FUNCTION "public"."get_latest_ready_order_for_store"("p_slug" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_public_order"("p_slug" "text", "p_order_id" "uuid", "p_public_token" "uuid") RETURNS TABLE("id" "uuid", "display_code" "text", "status" "public"."order_status", "refund_status" "public"."refund_status", "customer_name" "text", "placed_at" timestamp with time zone, "accepted_at" timestamp with time zone, "ready_at" timestamp with time zone, "finalized_at" timestamp with time zone, "rejected_at" timestamp with time zone, "total_amount" numeric, "note" "text")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    o.id,
    o.display_code,
    o.status,
    o.refund_status,
    o.customer_name,
    o.placed_at,
    o.accepted_at,
    o.ready_at,
    o.finalized_at,
    o.rejected_at,
    o.total_amount,
    o.note
  from public.orders o
  join public.stores s on s.id = o.store_id
  where s.slug = p_slug
    and o.id = p_order_id
    and o.public_token = p_public_token
  limit 1
$$;


ALTER FUNCTION "public"."get_public_order"("p_slug" "text", "p_order_id" "uuid", "p_public_token" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_order_items_total_sync"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if tg_op = 'DELETE' then
    perform public.recalculate_order_total(old.order_id);
    return old;
  end if;

  perform public.recalculate_order_total(new.order_id);

  if tg_op = 'UPDATE' and old.order_id is distinct from new.order_id then
    perform public.recalculate_order_total(old.order_id);
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_order_items_total_sync"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_recalculate_checkout_session_totals"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if tg_op = 'DELETE' then
    perform public.recalculate_checkout_session_totals(old.checkout_session_id);
    return old;
  else
    perform public.recalculate_checkout_session_totals(new.checkout_session_id);
    return new;
  end if;
end;
$$;


ALTER FUNCTION "public"."handle_recalculate_checkout_session_totals"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_recalculate_order_totals"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if tg_op = 'DELETE' then
    perform public.recalculate_order_totals(old.order_id);
    return old;
  else
    perform public.recalculate_order_totals(new.order_id);
    return new;
  end if;
end;
$$;


ALTER FUNCTION "public"."handle_recalculate_order_totals"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalculate_checkout_session_totals"("p_checkout_session_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_subtotal numeric(10,2);
begin
  select coalesce(sum(line_total), 0)
    into v_subtotal
    from public.checkout_session_items
   where checkout_session_id = p_checkout_session_id;

  update public.checkout_sessions
     set subtotal_amount = v_subtotal,
         total_amount = v_subtotal,
         updated_at = now()
   where id = p_checkout_session_id;
end;
$$;


ALTER FUNCTION "public"."recalculate_checkout_session_totals"("p_checkout_session_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalculate_order_total"("p_order_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  update public.orders o
     set total_amount = coalesce((
       select sum(oi.total_amount)
       from public.order_items oi
       where oi.order_id = p_order_id
     ), 0),
         updated_at = now()
   where o.id = p_order_id;
end;
$$;


ALTER FUNCTION "public"."recalculate_order_total"("p_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalculate_order_totals"("p_order_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_subtotal numeric(10,2);
begin
  select coalesce(sum(line_total), 0)
    into v_subtotal
    from public.order_items
   where order_id = p_order_id;

  update public.orders
     set subtotal_amount = v_subtotal,
         total_amount = v_subtotal,
         updated_at = now()
   where id = p_order_id;
end;
$$;


ALTER FUNCTION "public"."recalculate_order_totals"("p_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_order_pickup_code"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if new.pickup_code is null or trim(new.pickup_code) = '' then
    new.pickup_code := public.generate_pickup_code(new.store_id);
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."set_order_pickup_code"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_product_availability"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.stock_quantity := greatest(coalesce(new.stock_quantity, 0), 0);

  if new.track_stock = true then
    new.is_available := (new.stock_quantity > 0);
  else
    if new.is_available is null then
      new.is_available := true;
    end if;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."sync_product_availability"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."touch_orders_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at := now();
  return new;
end;
$$;


ALTER FUNCTION "public"."touch_orders_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "categories_name_not_empty" CHECK (("char_length"(TRIM(BOTH FROM "name")) > 0))
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."checkout_session_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "checkout_session_id" "uuid" NOT NULL,
    "product_id" "uuid",
    "product_name_snapshot" "text" NOT NULL,
    "unit_price" numeric(10,2) NOT NULL,
    "quantity" integer NOT NULL,
    "line_total" numeric(10,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "checkout_session_items_line_total_non_negative" CHECK (("line_total" >= (0)::numeric)),
    CONSTRAINT "checkout_session_items_name_not_empty" CHECK (("char_length"(TRIM(BOTH FROM "product_name_snapshot")) > 0)),
    CONSTRAINT "checkout_session_items_quantity_positive" CHECK (("quantity" > 0)),
    CONSTRAINT "checkout_session_items_unit_price_non_negative" CHECK (("unit_price" >= (0)::numeric))
);


ALTER TABLE "public"."checkout_session_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."checkout_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "public_reference" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    "customer_name" "text" NOT NULL,
    "customer_phone" "text" NOT NULL,
    "order_notes" "text",
    "payment_method" "public"."payment_method_type",
    "payment_status" "public"."payment_status" DEFAULT 'pending'::"public"."payment_status" NOT NULL,
    "service_mode" "public"."service_mode_type" DEFAULT 'counter_pickup'::"public"."service_mode_type" NOT NULL,
    "subtotal_amount" numeric(10,2) DEFAULT 0 NOT NULL,
    "total_amount" numeric(10,2) DEFAULT 0 NOT NULL,
    "payment_gateway" "text" DEFAULT 'mercadopago'::"text" NOT NULL,
    "external_payment_id" "text",
    "external_preference_id" "text",
    "approved_at" timestamp with time zone,
    "expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "checkout_sessions_customer_name_not_empty" CHECK (("char_length"(TRIM(BOTH FROM "customer_name")) > 0)),
    CONSTRAINT "checkout_sessions_customer_phone_not_empty" CHECK (("char_length"(TRIM(BOTH FROM "customer_phone")) > 0)),
    CONSTRAINT "checkout_sessions_subtotal_non_negative" CHECK (("subtotal_amount" >= (0)::numeric)),
    CONSTRAINT "checkout_sessions_total_non_negative" CHECK (("total_amount" >= (0)::numeric))
);


ALTER TABLE "public"."checkout_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_items" (
    "id" bigint NOT NULL,
    "order_id" "uuid" NOT NULL,
    "product_id" "uuid",
    "name" "text" NOT NULL,
    "price" numeric(10,2) NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "total_amount" numeric(10,2) GENERATED ALWAYS AS (("price" * ("quantity")::numeric)) STORED,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "order_items_price_check" CHECK (("price" >= (0)::numeric)),
    CONSTRAINT "order_items_quantity_check" CHECK (("quantity" > 0))
);


ALTER TABLE "public"."order_items" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."order_items_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."order_items_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."order_items_id_seq" OWNED BY "public"."order_items"."id";



CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    "order_number" integer,
    "display_code" "text" GENERATED ALWAYS AS ("lpad"(("order_number")::"text", 4, '0'::"text")) STORED,
    "public_token" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "status" "public"."order_status" DEFAULT 'aguardando_aceite'::"public"."order_status" NOT NULL,
    "refund_status" "public"."refund_status" DEFAULT 'none'::"public"."refund_status" NOT NULL,
    "total_amount" numeric(10,2) DEFAULT 0 NOT NULL,
    "note" "text",
    "customer_name" "text",
    "customer_phone" "text",
    "placed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "accepted_at" timestamp with time zone,
    "ready_at" timestamp with time zone,
    "finalized_at" timestamp with time zone,
    "rejected_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    "category_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "price" numeric(10,2) NOT NULL,
    "image_url" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "track_stock" boolean DEFAULT false NOT NULL,
    "stock_quantity" integer DEFAULT 0 NOT NULL,
    "is_available" boolean DEFAULT true NOT NULL,
    CONSTRAINT "products_name_not_empty" CHECK (("char_length"(TRIM(BOTH FROM "name")) > 0)),
    CONSTRAINT "products_price_non_negative" CHECK (("price" >= (0)::numeric)),
    CONSTRAINT "products_stock_quantity_non_negative" CHECK (("stock_quantity" >= 0))
);


ALTER TABLE "public"."products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "full_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."store_counters" (
    "store_id" "uuid" NOT NULL,
    "last_pickup_code" integer DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."store_counters" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."store_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    "primary_color" "text" DEFAULT '#000000'::"text",
    "accepts_orders" boolean DEFAULT true NOT NULL,
    "public_message" "text",
    "currency" "text" DEFAULT 'BRL'::"text" NOT NULL,
    "service_mode" "public"."service_mode_type" DEFAULT 'counter_pickup'::"public"."service_mode_type" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."store_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stores" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "logo_url" "text",
    "phone" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."stores" OWNER TO "postgres";


ALTER TABLE ONLY "public"."order_items" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."order_items_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."checkout_session_items"
    ADD CONSTRAINT "checkout_session_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."checkout_sessions"
    ADD CONSTRAINT "checkout_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."checkout_sessions"
    ADD CONSTRAINT "checkout_sessions_public_reference_key" UNIQUE ("public_reference");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_public_token_key" UNIQUE ("public_token");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_store_order_number_key" UNIQUE ("store_id", "order_number");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."store_counters"
    ADD CONSTRAINT "store_counters_pkey" PRIMARY KEY ("store_id");



ALTER TABLE ONLY "public"."store_settings"
    ADD CONSTRAINT "store_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."store_settings"
    ADD CONSTRAINT "store_settings_store_id_key" UNIQUE ("store_id");



ALTER TABLE ONLY "public"."stores"
    ADD CONSTRAINT "stores_owner_id_key" UNIQUE ("owner_id");



ALTER TABLE ONLY "public"."stores"
    ADD CONSTRAINT "stores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stores"
    ADD CONSTRAINT "stores_slug_key" UNIQUE ("slug");



CREATE INDEX "idx_categories_store_id" ON "public"."categories" USING "btree" ("store_id");



CREATE INDEX "idx_categories_store_sort" ON "public"."categories" USING "btree" ("store_id", "sort_order");



CREATE INDEX "idx_checkout_session_items_session_id" ON "public"."checkout_session_items" USING "btree" ("checkout_session_id");



CREATE INDEX "idx_checkout_sessions_external_payment_id" ON "public"."checkout_sessions" USING "btree" ("external_payment_id");



CREATE INDEX "idx_checkout_sessions_external_preference_id" ON "public"."checkout_sessions" USING "btree" ("external_preference_id");



CREATE INDEX "idx_checkout_sessions_payment_status" ON "public"."checkout_sessions" USING "btree" ("store_id", "payment_status");



CREATE INDEX "idx_checkout_sessions_store_id" ON "public"."checkout_sessions" USING "btree" ("store_id");



CREATE INDEX "idx_products_category_id" ON "public"."products" USING "btree" ("category_id");



CREATE INDEX "idx_products_store_id" ON "public"."products" USING "btree" ("store_id");



CREATE INDEX "idx_products_store_sort" ON "public"."products" USING "btree" ("store_id", "sort_order");



CREATE INDEX "order_items_order_idx" ON "public"."order_items" USING "btree" ("order_id");



CREATE INDEX "orders_store_placed_idx" ON "public"."orders" USING "btree" ("store_id", "placed_at" DESC);



CREATE INDEX "orders_store_ready_idx" ON "public"."orders" USING "btree" ("store_id", "ready_at" DESC);



CREATE INDEX "orders_store_status_idx" ON "public"."orders" USING "btree" ("store_id", "status");



CREATE UNIQUE INDEX "uq_categories_store_name_ci" ON "public"."categories" USING "btree" ("store_id", "lower"(TRIM(BOTH FROM "name")));



CREATE UNIQUE INDEX "uq_products_store_category_name_ci" ON "public"."products" USING "btree" ("store_id", "category_id", "lower"(TRIM(BOTH FROM "name")));



CREATE OR REPLACE TRIGGER "trg_assign_store_order_number" BEFORE INSERT ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."assign_store_order_number"();



CREATE OR REPLACE TRIGGER "trg_categories_updated_at" BEFORE UPDATE ON "public"."categories" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_checkout_sessions_updated_at" BEFORE UPDATE ON "public"."checkout_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_checkout_totals_delete" AFTER DELETE ON "public"."checkout_session_items" FOR EACH ROW EXECUTE FUNCTION "public"."handle_recalculate_checkout_session_totals"();



CREATE OR REPLACE TRIGGER "trg_checkout_totals_insert" AFTER INSERT ON "public"."checkout_session_items" FOR EACH ROW EXECUTE FUNCTION "public"."handle_recalculate_checkout_session_totals"();



CREATE OR REPLACE TRIGGER "trg_checkout_totals_update" AFTER UPDATE ON "public"."checkout_session_items" FOR EACH ROW EXECUTE FUNCTION "public"."handle_recalculate_checkout_session_totals"();



CREATE OR REPLACE TRIGGER "trg_order_items_total_sync" AFTER INSERT OR DELETE OR UPDATE ON "public"."order_items" FOR EACH ROW EXECUTE FUNCTION "public"."handle_order_items_total_sync"();



CREATE OR REPLACE TRIGGER "trg_products_updated_at" BEFORE UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_store_settings_updated_at" BEFORE UPDATE ON "public"."store_settings" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_stores_updated_at" BEFORE UPDATE ON "public"."stores" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_sync_product_availability" BEFORE INSERT OR UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."sync_product_availability"();



CREATE OR REPLACE TRIGGER "trg_touch_orders_updated_at" BEFORE UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."touch_orders_updated_at"();



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."checkout_session_items"
    ADD CONSTRAINT "checkout_session_items_checkout_session_id_fkey" FOREIGN KEY ("checkout_session_id") REFERENCES "public"."checkout_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."checkout_session_items"
    ADD CONSTRAINT "checkout_session_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."checkout_sessions"
    ADD CONSTRAINT "checkout_sessions_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."store_counters"
    ADD CONSTRAINT "store_counters_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."store_settings"
    ADD CONSTRAINT "store_settings_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stores"
    ADD CONSTRAINT "stores_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "categories_owner_all" ON "public"."categories" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."stores" "s"
  WHERE (("s"."id" = "categories"."store_id") AND ("s"."owner_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."stores" "s"
  WHERE (("s"."id" = "categories"."store_id") AND ("s"."owner_id" = "auth"."uid"())))));



CREATE POLICY "categories_public_read_active" ON "public"."categories" FOR SELECT TO "authenticated", "anon" USING ((("is_active" = true) AND (EXISTS ( SELECT 1
   FROM "public"."stores" "s"
  WHERE (("s"."id" = "categories"."store_id") AND ("s"."is_active" = true))))));



ALTER TABLE "public"."checkout_session_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "checkout_session_items_public_insert" ON "public"."checkout_session_items" FOR INSERT TO "authenticated", "anon" WITH CHECK ((("product_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM ((("public"."checkout_sessions" "cs"
     JOIN "public"."stores" "s" ON (("s"."id" = "cs"."store_id")))
     JOIN "public"."store_settings" "ss" ON (("ss"."store_id" = "s"."id")))
     JOIN "public"."products" "p" ON (("p"."id" = "checkout_session_items"."product_id")))
  WHERE (("cs"."id" = "checkout_session_items"."checkout_session_id") AND ("cs"."payment_status" = 'pending'::"public"."payment_status") AND ("s"."is_active" = true) AND ("ss"."accepts_orders" = true) AND ("p"."store_id" = "cs"."store_id") AND ("p"."is_active" = true) AND ("p"."is_available" = true) AND (("p"."track_stock" = false) OR ("p"."stock_quantity" >= "checkout_session_items"."quantity")))))));



ALTER TABLE "public"."checkout_sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "checkout_sessions_public_insert" ON "public"."checkout_sessions" FOR INSERT TO "authenticated", "anon" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."stores" "s"
     JOIN "public"."store_settings" "ss" ON (("ss"."store_id" = "s"."id")))
  WHERE (("s"."id" = "checkout_sessions"."store_id") AND ("s"."is_active" = true) AND ("ss"."accepts_orders" = true)))));



ALTER TABLE "public"."order_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "order_items_delete_own_store" ON "public"."order_items" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."orders" "o"
     JOIN "public"."stores" "s" ON (("s"."id" = "o"."store_id")))
  WHERE (("o"."id" = "order_items"."order_id") AND ("s"."owner_id" = "auth"."uid"())))));



CREATE POLICY "order_items_insert_own_store" ON "public"."order_items" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."orders" "o"
     JOIN "public"."stores" "s" ON (("s"."id" = "o"."store_id")))
  WHERE (("o"."id" = "order_items"."order_id") AND ("s"."owner_id" = "auth"."uid"())))));



CREATE POLICY "order_items_select_own_store" ON "public"."order_items" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."orders" "o"
     JOIN "public"."stores" "s" ON (("s"."id" = "o"."store_id")))
  WHERE (("o"."id" = "order_items"."order_id") AND ("s"."owner_id" = "auth"."uid"())))));



CREATE POLICY "order_items_update_own_store" ON "public"."order_items" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."orders" "o"
     JOIN "public"."stores" "s" ON (("s"."id" = "o"."store_id")))
  WHERE (("o"."id" = "order_items"."order_id") AND ("s"."owner_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."orders" "o"
     JOIN "public"."stores" "s" ON (("s"."id" = "o"."store_id")))
  WHERE (("o"."id" = "order_items"."order_id") AND ("s"."owner_id" = "auth"."uid"())))));



ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "orders_insert_own_store" ON "public"."orders" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."stores" "s"
  WHERE (("s"."id" = "orders"."store_id") AND ("s"."owner_id" = "auth"."uid"())))));



CREATE POLICY "orders_select_own_store" ON "public"."orders" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."stores" "s"
  WHERE (("s"."id" = "orders"."store_id") AND ("s"."owner_id" = "auth"."uid"())))));



CREATE POLICY "orders_update_own_store" ON "public"."orders" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."stores" "s"
  WHERE (("s"."id" = "orders"."store_id") AND ("s"."owner_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."stores" "s"
  WHERE (("s"."id" = "orders"."store_id") AND ("s"."owner_id" = "auth"."uid"())))));



ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "products_owner_all" ON "public"."products" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."stores" "s"
  WHERE (("s"."id" = "products"."store_id") AND ("s"."owner_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."stores" "s"
  WHERE (("s"."id" = "products"."store_id") AND ("s"."owner_id" = "auth"."uid"())))));



CREATE POLICY "products_public_read_active" ON "public"."products" FOR SELECT TO "authenticated", "anon" USING ((("is_active" = true) AND (EXISTS ( SELECT 1
   FROM "public"."stores" "s"
  WHERE (("s"."id" = "products"."store_id") AND ("s"."is_active" = true))))));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_select_own" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "profiles_update_own" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id"));



ALTER TABLE "public"."store_counters" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "store_counters_owner_all" ON "public"."store_counters" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."stores" "s"
  WHERE (("s"."id" = "store_counters"."store_id") AND ("s"."owner_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."stores" "s"
  WHERE (("s"."id" = "store_counters"."store_id") AND ("s"."owner_id" = "auth"."uid"())))));



ALTER TABLE "public"."store_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "store_settings_owner_all" ON "public"."store_settings" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."stores" "s"
  WHERE (("s"."id" = "store_settings"."store_id") AND ("s"."owner_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."stores" "s"
  WHERE (("s"."id" = "store_settings"."store_id") AND ("s"."owner_id" = "auth"."uid"())))));



ALTER TABLE "public"."stores" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "stores_insert_own" ON "public"."stores" FOR INSERT TO "authenticated" WITH CHECK (("owner_id" = "auth"."uid"()));



CREATE POLICY "stores_select_own" ON "public"."stores" FOR SELECT TO "authenticated" USING (("owner_id" = "auth"."uid"()));



CREATE POLICY "stores_update_own" ON "public"."stores" FOR UPDATE TO "authenticated" USING (("owner_id" = "auth"."uid"()));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."assign_store_order_number"() TO "anon";
GRANT ALL ON FUNCTION "public"."assign_store_order_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."assign_store_order_number"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_order_from_checkout_session"("p_checkout_session_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_order_from_checkout_session"("p_checkout_session_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_order_from_checkout_session"("p_checkout_session_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."finalize_order_cancellation"("p_order_id" "uuid", "p_payment_status" "public"."payment_status", "p_reason" "text", "p_external_refund_id" "text", "p_refund_amount" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."finalize_order_cancellation"("p_order_id" "uuid", "p_payment_status" "public"."payment_status", "p_reason" "text", "p_external_refund_id" "text", "p_refund_amount" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."finalize_order_cancellation"("p_order_id" "uuid", "p_payment_status" "public"."payment_status", "p_reason" "text", "p_external_refund_id" "text", "p_refund_amount" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_pickup_code"("p_store_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_pickup_code"("p_store_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_pickup_code"("p_store_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_latest_ready_order_for_store"("p_slug" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_latest_ready_order_for_store"("p_slug" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_latest_ready_order_for_store"("p_slug" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_public_order"("p_slug" "text", "p_order_id" "uuid", "p_public_token" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_public_order"("p_slug" "text", "p_order_id" "uuid", "p_public_token" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_public_order"("p_slug" "text", "p_order_id" "uuid", "p_public_token" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_order_items_total_sync"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_order_items_total_sync"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_order_items_total_sync"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_recalculate_checkout_session_totals"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_recalculate_checkout_session_totals"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_recalculate_checkout_session_totals"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_recalculate_order_totals"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_recalculate_order_totals"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_recalculate_order_totals"() TO "service_role";



GRANT ALL ON FUNCTION "public"."recalculate_checkout_session_totals"("p_checkout_session_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."recalculate_checkout_session_totals"("p_checkout_session_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalculate_checkout_session_totals"("p_checkout_session_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."recalculate_order_total"("p_order_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."recalculate_order_total"("p_order_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalculate_order_total"("p_order_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."recalculate_order_totals"("p_order_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."recalculate_order_totals"("p_order_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalculate_order_totals"("p_order_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_order_pickup_code"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_order_pickup_code"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_order_pickup_code"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_product_availability"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_product_availability"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_product_availability"() TO "service_role";



GRANT ALL ON FUNCTION "public"."touch_orders_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."touch_orders_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."touch_orders_updated_at"() TO "service_role";


















GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON TABLE "public"."checkout_session_items" TO "anon";
GRANT ALL ON TABLE "public"."checkout_session_items" TO "authenticated";
GRANT ALL ON TABLE "public"."checkout_session_items" TO "service_role";



GRANT ALL ON TABLE "public"."checkout_sessions" TO "anon";
GRANT ALL ON TABLE "public"."checkout_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."checkout_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."order_items" TO "anon";
GRANT ALL ON TABLE "public"."order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."order_items" TO "service_role";



GRANT ALL ON SEQUENCE "public"."order_items_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."order_items_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."order_items_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."orders" TO "anon";
GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."store_counters" TO "anon";
GRANT ALL ON TABLE "public"."store_counters" TO "authenticated";
GRANT ALL ON TABLE "public"."store_counters" TO "service_role";



GRANT ALL ON TABLE "public"."store_settings" TO "anon";
GRANT ALL ON TABLE "public"."store_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."store_settings" TO "service_role";



GRANT ALL ON TABLE "public"."stores" TO "anon";
GRANT ALL ON TABLE "public"."stores" TO "authenticated";
GRANT ALL ON TABLE "public"."stores" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";

drop policy "categories_public_read_active" on "public"."categories";

drop policy "checkout_session_items_public_insert" on "public"."checkout_session_items";

drop policy "checkout_sessions_public_insert" on "public"."checkout_sessions";

drop policy "products_public_read_active" on "public"."products";


  create policy "categories_public_read_active"
  on "public"."categories"
  as permissive
  for select
  to anon, authenticated
using (((is_active = true) AND (EXISTS ( SELECT 1
   FROM public.stores s
  WHERE ((s.id = categories.store_id) AND (s.is_active = true))))));



  create policy "checkout_session_items_public_insert"
  on "public"."checkout_session_items"
  as permissive
  for insert
  to anon, authenticated
with check (((product_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM (((public.checkout_sessions cs
     JOIN public.stores s ON ((s.id = cs.store_id)))
     JOIN public.store_settings ss ON ((ss.store_id = s.id)))
     JOIN public.products p ON ((p.id = checkout_session_items.product_id)))
  WHERE ((cs.id = checkout_session_items.checkout_session_id) AND (cs.payment_status = 'pending'::public.payment_status) AND (s.is_active = true) AND (ss.accepts_orders = true) AND (p.store_id = cs.store_id) AND (p.is_active = true) AND (p.is_available = true) AND ((p.track_stock = false) OR (p.stock_quantity >= checkout_session_items.quantity)))))));



  create policy "checkout_sessions_public_insert"
  on "public"."checkout_sessions"
  as permissive
  for insert
  to anon, authenticated
with check ((EXISTS ( SELECT 1
   FROM (public.stores s
     JOIN public.store_settings ss ON ((ss.store_id = s.id)))
  WHERE ((s.id = checkout_sessions.store_id) AND (s.is_active = true) AND (ss.accepts_orders = true)))));



  create policy "products_public_read_active"
  on "public"."products"
  as permissive
  for select
  to anon, authenticated
using (((is_active = true) AND (EXISTS ( SELECT 1
   FROM public.stores s
  WHERE ((s.id = products.store_id) AND (s.is_active = true))))));


CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


