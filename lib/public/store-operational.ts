type PublicStoreOperationalInput = {
  acceptsOrdersSetting: boolean;
  visibleMenuItems: number;
};

export type PublicStoreOperationalState = {
  isOperationallyReady: boolean;
  acceptsOrders: boolean;
  canPlaceOrders: boolean;
  summaryLabel: string;
  unavailableMessage: string | null;
};

export function getPublicStoreOperationalState({
  acceptsOrdersSetting,
  visibleMenuItems,
}: PublicStoreOperationalInput): PublicStoreOperationalState {
  const isOperationallyReady = visibleMenuItems > 0;
  const acceptsOrders = acceptsOrdersSetting;
  const canPlaceOrders = acceptsOrders && isOperationallyReady;

  if (canPlaceOrders) {
    return {
      isOperationallyReady,
      acceptsOrders,
      canPlaceOrders,
      summaryLabel: "Aceitando pedidos",
      unavailableMessage: null,
    };
  }

  if (!acceptsOrders) {
    return {
      isOperationallyReady,
      acceptsOrders,
      canPlaceOrders,
      summaryLabel: "Pedidos pausados",
      unavailableMessage: "A loja pausou temporariamente o recebimento de novos pedidos. Tente novamente quando reabrir.",
    };
  }

  return {
    isOperationallyReady,
    acceptsOrders,
    canPlaceOrders,
    summaryLabel: "Loja indisponível para pedidos",
    unavailableMessage: "A loja ainda não está pronta para receber pedidos agora.",
  };
}
