/**
 * Tipos compartilhados do domínio (estabelecimento, cardápio, pedidos).
 * Gere tipos oficiais com `supabase gen types` quando o schema estabilizar.
 */

/** Identificador público na URL do cardápio (ex.: slug do estabelecimento). */
export type EstablishmentSlug = string;

/** Perfil do usuário em public.profiles (sem telefone — telefone fica em stores). */
export type Profile = {
  id: string;
  full_name: string | null;
};

/** Loja do comerciante (alinhado a public.stores no Supabase). */
export type Store = {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  phone: string | null;
  logo_url: string | null;
};

/** Período operacional manual ou programado da loja. */
export type StoreOperationalPeriod = {
  id: string;
  store_id: string;
  opened_at: string;
  closed_at: string | null;
  mode: "manual" | "schedule";
  created_at: string;
  updated_at: string;
};

/** Categoria do cardápio (public.categories). */
export type Category = {
  id: string;
  store_id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

/** Produto do cardápio (public.products). */
export type Product = {
  id: string;
  store_id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_active: boolean;
  is_available: boolean;
  track_stock: boolean;
  stock_quantity: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

/** Status operacional do pedido. */
export type OrderStatus =
  | "aguardando_aceite"
  | "em_preparo"
  | "pronto_para_retirada"
  | "finalizado"
  | "recusado"
  | "cancelado";

/** Status separado para reembolso (não mistura com o status operacional). */
export type RefundStatus = "none" | "pendente" | "reembolsado" | "falhou";

/** Pedido (public.orders). */
export type Order = {
  id: string;
  store_id: string;
  order_number: number | null;
  display_code: string | null;
  public_token: string;
  status: OrderStatus;
  refund_status: RefundStatus;
  total_amount: number;
  note: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  placed_at: string;
  accepted_at: string | null;
  ready_at: string | null;
  finalized_at: string | null;
  rejected_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
};

/** Item do pedido (public.order_items). */
export type OrderItem = {
  id: number;
  order_id: string;
  product_id: string | null;
  name: string;
  price: number;
  quantity: number;
  total_amount: number;
  created_at: string;
};

export type OrderWithItems = Order & { items?: OrderItem[] };

/** Retorno da RPC public.get_public_store_by_slug. */
export type PublicStoreRpcRow = {
  store_id: string;
  name: string;
  slug: string;
  phone: string | null;
  logo_url: string | null;
  accepts_orders: boolean;
  accepts_orders_manual: boolean;
  auto_accept_orders_by_schedule: boolean;
  opening_time: string | null;
  closing_time: string | null;
  is_within_service_hours: boolean;
  public_message: string | null;
};

/** Retorno da RPC public.get_public_menu_by_slug. */
export type PublicMenuRpcRow = {
  category_id: string;
  category_name: string;
  category_sort_order: number;
  product_id: string | null;
  product_name: string | null;
  product_description: string | null;
  product_price: number | string | null;
  product_image_url: string | null;
  track_stock: boolean | null;
  stock_quantity: number | string | null;
};

/** Item persistido no carrinho público (localStorage). */
export type PublicCartItem = {
  product_id: string;
  name: string;
  unit_price: number;
  quantity: number;
};

/** Item de checkout enviado para a RPC create_checkout_session_by_slug. */
export type CheckoutRpcItemInput = {
  product_id: string;
  quantity: number;
};

/** Item de carrinho usado na tela de checkout. */
export type PublicCheckoutCartItem = {
  product_id: string;
  name: string;
  unit_price: number;
  quantity: number;
};

/** Retorno da RPC public.create_checkout_session_by_slug. */
export type CreateCheckoutSessionRpcRow = {
  checkout_session_id: string;
  public_token: string;
  store_id: string;
  status: string;
  total_amount: number | string;
  expires_at: string | null;
};

/** Retorno da RPC public.simulate_checkout_payment_success. */
export type SimulateCheckoutPaymentSuccessRpcRow = {
  checkout_session_id: string;
  checkout_public_token: string;
  checkout_status: string;
  paid_at: string | null;
  order_id: string | null;
  order_public_token: string | null;
  order_number: number | null;
  display_code: string | null;
  order_status: string | null;
};

/** Retorno da RPC public.cancel_checkout_session_by_token. */
export type CancelCheckoutSessionRpcRow = {
  checkout_session_id: string;
  checkout_public_token?: string | null;
  checkout_status?: string | null;
  status?: string | null;
  cancelled_at?: string | null;
  expires_at?: string | null;
  converted_at?: string | null;
};
