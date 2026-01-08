"use client";
import { initMercadoPago, Wallet } from "@mercadopago/sdk-react";
import { useEffect, useMemo, useState } from "react";

let mpInitialized = false;

export default function MercadoPagoCheckout({ items, total, orderId }) {
  const [preferenceId, setPreferenceId] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const publicKey = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY || process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY;

  const normalizedItems = useMemo(() => {
    const arr = Array.isArray(items) ? items : [];
    return arr
      .map((it) => ({
        title: String(it?.title || it?.name || "Producto"),
        quantity: Math.max(1, Number(it?.quantity || 1)),
        unit_price: Number(it?.unit_price ?? it?.price ?? 0),
      }))
      .filter((it) => Number.isFinite(it.unit_price) && it.unit_price > 0);
  }, [items]);

  const normalizedTotal = useMemo(() => {
    const n = Number(total);
    return Number.isFinite(n) ? n : 0;
  }, [total]);

  useEffect(() => {
    if (!publicKey) {
      setErr("Falta NEXT_PUBLIC_MP_PUBLIC_KEY");
      return;
    }
    if (!mpInitialized) {
      initMercadoPago(publicKey, { locale: "es-MX" });
      mpInitialized = true;
    }
  }, [publicKey]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setErr("");
      setPreferenceId("");
      setLoading(true);
      try {
        const payload =
          normalizedItems.length > 0
            ? { items: normalizedItems, orderId }
            : { total: normalizedTotal, orderId };

        if (!payload.items && (!payload.total || payload.total <= 0)) {
          throw new Error("Total inválido para cobrar.");
        }

        const res = await fetch("/api/mp/preference", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || "No se pudo crear la preferencia.");
        if (!data?.preferenceId) throw new Error("PreferenceId inválido.");

        if (!cancelled) setPreferenceId(String(data.preferenceId));
      } catch (e) {
        if (!cancelled) setErr(e?.message || "Error creando preferencia.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [orderId, normalizedTotal, JSON.stringify(normalizedItems)]);

  return (
    <div>
      {loading && <div>Cargando Mercado Pago…</div>}
      {err && (
        <div style={{ padding: 12, border: "1px solid #ff4d4f", borderRadius: 8 }}>
          <b>Error:</b> {err}
        </div>
      )}

      {/* IMPORTANT: Render Wallet only when preferenceId exists */}
      {preferenceId ? <Wallet initialization={{ preferenceId }} /> : null}
    </div>
  );
}
