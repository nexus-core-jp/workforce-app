"use client";

import { useEffect, useReducer, useState } from "react";

interface PromoCode {
  id: string;
  code: string;
  active: boolean;
  timesRedeemed: number;
  maxRedemptions: number | null;
  expiresAt: string | null;
}

interface CouponItem {
  id: string;
  name: string;
  percentOff: number | null;
  amountOff: number | null;
  currency: string | null;
  duration: string;
  durationInMonths: number | null;
  timesRedeemed: number;
  maxRedemptions: number | null;
  valid: boolean;
  createdAt: string;
  promoCodes: PromoCode[];
}

type FetchState = {
  coupons: CouponItem[];
  loading: boolean;
  error: string | null;
};

type FetchAction =
  | { type: "FETCH_START" }
  | { type: "FETCH_SUCCESS"; coupons: CouponItem[] }
  | { type: "FETCH_ERROR"; error: string };

function fetchReducer(state: FetchState, action: FetchAction): FetchState {
  switch (action.type) {
    case "FETCH_START":
      return { ...state, loading: true, error: null };
    case "FETCH_SUCCESS":
      return { coupons: action.coupons, loading: false, error: null };
    case "FETCH_ERROR":
      return { ...state, loading: false, error: action.error };
  }
}

async function fetchCoupons(dispatch: React.Dispatch<FetchAction>, signal: AbortSignal) {
  dispatch({ type: "FETCH_START" });
  try {
    const res = await fetch("/api/super-admin/coupons", { signal });
    const d = await res.json();
    if (signal.aborted) return;
    if (d.ok) dispatch({ type: "FETCH_SUCCESS", coupons: d.coupons });
    else dispatch({ type: "FETCH_ERROR", error: d.error });
  } catch {
    if (!signal.aborted) dispatch({ type: "FETCH_ERROR", error: "取得に失敗しました" });
  }
}

export function CouponManager() {
  const [state, dispatch] = useReducer(fetchReducer, {
    coupons: [],
    loading: true,
    error: null,
  });
  const [showForm, setShowForm] = useState(false);
  const [reloadKey, reload] = useReducer((x: number) => x + 1, 0);

  useEffect(() => {
    const controller = new AbortController();
    fetchCoupons(dispatch, controller.signal);
    return () => controller.abort();
  }, [reloadKey]);

  const { coupons, loading, error } = state;

  const handleDelete = async (id: string) => {
    if (!confirm("このクーポンを無効にしますか？")) return;
    const res = await fetch("/api/super-admin/coupons", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) reload();
  };

  if (loading) return <p>読み込み中...</p>;
  if (error) return <p style={{ color: "var(--color-danger)" }}>{error}</p>;

  return (
    <>
      <button
        type="button"
        onClick={() => setShowForm(!showForm)}
        data-variant="primary"
        style={{ marginBottom: 16 }}
      >
        {showForm ? "フォームを閉じる" : "新しいクーポンを作成"}
      </button>

      {showForm && <CreateCouponForm onCreated={() => { setShowForm(false); reload(); }} />}

      {coupons.length === 0 ? (
        <p style={{ color: "var(--color-text-secondary)", fontSize: 13 }}>
          クーポンはまだ作成されていません。
        </p>
      ) : (
        <div className="table-scroll">
          <table style={{ fontSize: 13 }}>
            <thead>
              <tr>
                <th>名称</th>
                <th>割引</th>
                <th>期間</th>
                <th>プロモコード</th>
                <th>使用回数</th>
                <th>状態</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>
                    {c.percentOff ? `${c.percentOff}% OFF` : `${c.amountOff?.toLocaleString()} ${c.currency?.toUpperCase()} OFF`}
                  </td>
                  <td>
                    {c.duration === "once" ? "初回のみ" : c.duration === "forever" ? "永続" : `${c.durationInMonths}ヶ月`}
                  </td>
                  <td>
                    {c.promoCodes.map((p) => (
                      <span key={p.id} style={{
                        display: "inline-block",
                        background: "var(--color-surface)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 4,
                        padding: "2px 6px",
                        marginRight: 4,
                        fontFamily: "monospace",
                        fontSize: 12,
                      }}>
                        {p.code}
                      </span>
                    ))}
                  </td>
                  <td>{c.timesRedeemed}{c.maxRedemptions ? ` / ${c.maxRedemptions}` : ""}</td>
                  <td>
                    <span className={`badge ${c.valid ? "badge-approved" : "badge-rejected"}`}>
                      {c.valid ? "有効" : "無効"}
                    </span>
                  </td>
                  <td>
                    {c.valid && (
                      <button
                        type="button"
                        onClick={() => handleDelete(c.id)}
                        style={{ fontSize: 12, padding: "2px 8px" }}
                      >
                        無効化
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function CreateCouponForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "amount">("percent");
  const [percentOff, setPercentOff] = useState(10);
  const [amountOff, setAmountOff] = useState(1000);
  const [duration, setDuration] = useState<"once" | "repeating" | "forever">("once");
  const [durationInMonths, setDurationInMonths] = useState(3);
  const [maxRedemptions, setMaxRedemptions] = useState<number | "">("");
  const [expiresAt, setExpiresAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const body = {
      name,
      code: code.toUpperCase(),
      ...(discountType === "percent" ? { percentOff } : { amountOff, currency: "jpy" }),
      duration,
      ...(duration === "repeating" ? { durationInMonths } : {}),
      ...(maxRedemptions ? { maxRedemptions: Number(maxRedemptions) } : {}),
      ...(expiresAt ? { expiresAt } : {}),
    };

    try {
      const res = await fetch("/api/super-admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "作成に失敗しました");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "作成に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{
      border: "1px solid var(--color-border)",
      borderRadius: 8,
      padding: 16,
      marginBottom: 16,
      background: "var(--color-surface)",
    }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 12 }}>
        <div>
          <label style={{ display: "block", fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 4 }}>
            クーポン名
          </label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
            placeholder="例: 開設キャンペーン" style={{ width: "100%", padding: "6px 8px" }} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 4 }}>
            プロモーションコード
          </label>
          <input type="text" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required
            placeholder="例: WELCOME2026" style={{ width: "100%", padding: "6px 8px", fontFamily: "monospace" }} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 12 }}>
        <div>
          <label style={{ display: "block", fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 4 }}>
            割引タイプ
          </label>
          <select value={discountType} onChange={(e) => setDiscountType(e.target.value as "percent" | "amount")}
            style={{ width: "100%", padding: "6px 8px" }}>
            <option value="percent">割合 (%)</option>
            <option value="amount">固定額 (JPY)</option>
          </select>
        </div>
        <div>
          <label style={{ display: "block", fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 4 }}>
            {discountType === "percent" ? "割引率 (%)" : "割引額 (円)"}
          </label>
          {discountType === "percent" ? (
            <input type="number" min={1} max={100} value={percentOff} onChange={(e) => setPercentOff(Number(e.target.value))}
              style={{ width: "100%", padding: "6px 8px" }} />
          ) : (
            <input type="number" min={1} value={amountOff} onChange={(e) => setAmountOff(Number(e.target.value))}
              style={{ width: "100%", padding: "6px 8px" }} />
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 12 }}>
        <div>
          <label style={{ display: "block", fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 4 }}>
            適用期間
          </label>
          <select value={duration} onChange={(e) => setDuration(e.target.value as "once" | "repeating" | "forever")}
            style={{ width: "100%", padding: "6px 8px" }}>
            <option value="once">初回請求のみ</option>
            <option value="repeating">複数月</option>
            <option value="forever">永続</option>
          </select>
        </div>
        {duration === "repeating" && (
          <div>
            <label style={{ display: "block", fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 4 }}>
              適用月数
            </label>
            <input type="number" min={1} max={36} value={durationInMonths}
              onChange={(e) => setDurationInMonths(Number(e.target.value))}
              style={{ width: "100%", padding: "6px 8px" }} />
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 16 }}>
        <div>
          <label style={{ display: "block", fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 4 }}>
            使用回数上限（空欄=無制限）
          </label>
          <input type="number" min={1} value={maxRedemptions}
            onChange={(e) => setMaxRedemptions(e.target.value ? Number(e.target.value) : "")}
            placeholder="無制限"
            style={{ width: "100%", padding: "6px 8px" }} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 4 }}>
            有効期限（空欄=無期限）
          </label>
          <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)}
            style={{ width: "100%", padding: "6px 8px" }} />
        </div>
      </div>

      {error && <p style={{ color: "var(--color-danger)", marginBottom: 8 }}>{error}</p>}

      <button type="submit" disabled={saving} data-variant="primary">
        {saving ? "作成中..." : "クーポンを作成"}
      </button>
    </form>
  );
}
