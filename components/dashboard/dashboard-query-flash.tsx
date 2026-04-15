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
      "erro-loja": "Não foi possível identificar sua loja.",
      "erro-pedido": "Não foi possível concluir a ação. Tente novamente.",
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
      excluido: "Produto excluído com sucesso.",
      "erro-campos": "Preencha nome, preço e categoria.",
      "erro-loja": "Não foi possível identificar sua loja.",
      "erro-permissao": "Não foi possível concluir a ação. Tente novamente.",
    },
  },
  {
    prefix: "/dashboard/categorias",
    messages: {
      criada: "Categoria criada com sucesso.",
      "nome-atualizado": "Categoria atualizada com sucesso.",
      "estado-alterado": "Categoria atualizada com sucesso.",
      reordenada: "Categoria reordenada.",
      excluida: "Categoria excluída com sucesso.",
      "erro-nome": "Informe um nome válido para salvar.",
      "erro-loja": "Não foi possível identificar sua loja.",
      "erro-permissao": "Não foi possível concluir a ação. Tente novamente.",
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

  return "Ação concluída com sucesso.";
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

function isWarningAviso(aviso: string) {
  return aviso.startsWith("erro-");
}

export function DashboardQueryFlash() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { enqueueToast } = useToast();

  const handledKeyRef = useRef<string | null>(null);

  const aviso = searchParams.get("aviso");
  const erro = searchParams.get("erro");
  const flash = searchParams.get("flash");

  const uniqueKey = useMemo(() => {
    if (!aviso && !erro) {
      return null;
    }

    return `${pathname}|${aviso ?? ""}|${erro ?? ""}|${flash ?? ""}`;
  }, [aviso, erro, flash, pathname]);

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
      const warningAviso = isWarningAviso(aviso);

      enqueueToast({
        id: avisoToastId,
        tone: warningAviso ? "warning" : "success",
        title: warningAviso ? "Ação não concluída" : "Ação concluída",
        text: resolveAvisoText(pathname, aviso),
      });
    }

    if (erro) {
      enqueueToast({
        id: erroToastId,
        tone: "error",
        title: "Falha ao concluir ação",
        text: safeDecode(erro),
      });
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete("aviso");
    params.delete("erro");
    params.delete("flash");

    const nextHref = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(nextHref, { scroll: false });
  }, [aviso, enqueueToast, erro, pathname, router, searchParams, uniqueKey]);

  return null;
}
