"use client";

import { useToast } from "@/components/shared/toast-provider";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";

const AVISO_BY_ROUTE_PREFIX: Array<{ prefix: string; messages: Record<string, string> }> = [
  {
    prefix: "/dashboard/pedidos",
    messages: {
      em_preparo: "Pedido aceito e enviado para preparo.",
      recusado: "Pedido recusado e estoque devolvido.",
      cancelado: "Pedido cancelado e estoque devolvido.",
      pronto_para_retirada: "Pedido marcado como pronto para retirada.",
      finalizado: "Pedido finalizado com sucesso.",
      "erro-loja": "Nao foi possivel identificar sua loja.",
      "erro-pedido": "Nao foi possivel concluir a acao. Tente novamente.",
    },
  },
  {
    prefix: "/dashboard/produtos",
    messages: {
      criado: "Produto criado com sucesso.",
      atualizado: "Produto atualizado com sucesso.",
      desativado: "Produto desativado com sucesso.",
      ativado: "Produto ativado com sucesso.",
      "venda-pausada": "Venda do produto pausada com sucesso.",
      "venda-liberada": "Venda do produto liberada com sucesso.",
      reordenado: "Produto reordenado.",
      excluido: "Produto excluido com sucesso.",
      "erro-campos": "Preencha nome, preco e categoria.",
      "erro-loja": "Nao foi possivel identificar sua loja.",
      "erro-permissao": "Nao foi possivel concluir a acao. Tente novamente.",
    },
  },
  {
    prefix: "/dashboard/categorias",
    messages: {
      criada: "Categoria criada com sucesso.",
      "nome-atualizado": "Categoria atualizada com sucesso.",
      "estado-alterado": "Categoria atualizada com sucesso.",
      reordenada: "Categoria reordenada.",
      excluida: "Categoria excluida com sucesso.",
      "erro-nome": "Informe um nome valido para salvar.",
      "erro-loja": "Nao foi possivel identificar sua loja.",
      "erro-permissao": "Nao foi possivel concluir a acao. Tente novamente.",
    },
  },
];

function resolveAvisoText(pathname: string, aviso: string): string {
  for (const entry of AVISO_BY_ROUTE_PREFIX) {
    if (!pathname.startsWith(entry.prefix)) {
      continue;
    }

    const routeMessage = entry.messages[aviso];
    if (routeMessage) {
      return routeMessage;
    }
  }

  return "Acao concluida com sucesso.";
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function hashToBase36(input: string) {
  let hash = 0;

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }

  return hash.toString(36);
}

export function DashboardQueryFlash() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { enqueueToast } = useToast();

  const handledKeyRef = useRef<string | null>(null);

  const aviso = searchParams.get("aviso");
  const erro = searchParams.get("erro");

  const uniqueKey = useMemo(() => {
    if (!aviso && !erro) {
      return null;
    }

    return `${pathname}|${aviso ?? ""}|${erro ?? ""}`;
  }, [aviso, erro, pathname]);

  useEffect(() => {
    if (uniqueKey !== null) {
      return;
    }

    handledKeyRef.current = null;
  }, [uniqueKey]);

  useEffect(() => {
    if (!uniqueKey || handledKeyRef.current === uniqueKey) {
      return;
    }

    handledKeyRef.current = uniqueKey;
    const avisoToastId = `query-aviso-${hashToBase36(`${uniqueKey}|aviso`)}`;
    const erroToastId = `query-erro-${hashToBase36(`${uniqueKey}|erro`)}`;

    if (aviso) {
      enqueueToast({
        id: avisoToastId,
        tone: "success",
        title: "Alteracao aplicada",
        text: resolveAvisoText(pathname, aviso),
      });
    }

    if (erro) {
      enqueueToast({
        id: erroToastId,
        tone: "error",
        title: "Falha ao concluir acao",
        text: safeDecode(erro),
      });
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete("aviso");
    params.delete("erro");

    const nextHref = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(nextHref, { scroll: false });
  }, [aviso, enqueueToast, erro, pathname, router, searchParams, uniqueKey]);

  return null;
}
