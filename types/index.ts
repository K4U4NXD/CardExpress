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
  | "recusado";

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
