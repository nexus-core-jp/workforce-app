"use client";

import { useState } from "react";

type PaymentMethodType = "STRIPE" | "PAYJP" | "BANK_TRANSFER" | "NONE";

interface Props {
  plan: string;
  paymentMethod: PaymentMethodType;
}

export function BillingActions({ plan, paymentMethod }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [selectedMethod, setSelectedMethod] = useState<"stripe" | "payjp" | "bank" | null>(null);
  const [bankRequested, setBankRequested] = useState(false);

  async function handleStripeCheckout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(promoCode ? { promoCode } : {}),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "エラーが発生しました");
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error ?? "チェックアウトの作成に失敗しました");
      }
    } catch {
      setError("ネットワークエラーが発生しました。再度お試しください。");
    } finally {
      setLoading(false);
    }
  }

  async function handleStripePortal() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "エラーが発生しました");
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error ?? "支払い管理画面の取得に失敗しました");
      }
    } catch {
      setError("ネットワークエラーが発生しました。再度お試しください。");
    } finally {
      setLoading(false);
    }
  }

  async function handleBankTransfer() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/bank-transfer", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "エラーが発生しました");
        return;
      }
      setBankRequested(true);
    } catch {
      setError("ネットワークエラーが発生しました。再度お試しください。");
    } finally {
      setLoading(false);
    }
  }

  // ACTIVE plan: show management based on current payment method
  if (plan === "ACTIVE") {
    return (
      <div>
        <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 8 }}>
          決済方法: {paymentMethod === "STRIPE" ? "クレジットカード（Stripe）" : paymentMethod === "PAYJP" ? "クレジットカード（PAY.JP）" : paymentMethod === "BANK_TRANSFER" ? "銀行振込" : "未設定"}
        </div>
        {paymentMethod === "STRIPE" && (
          <button onClick={handleStripePortal} disabled={loading} data-variant="primary">
            {loading ? "読み込み中..." : "支払い管理（Stripe）"}
          </button>
        )}
        {paymentMethod === "BANK_TRANSFER" && (
          <p style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>
            請求書は運営から送付されます。お支払い状況はスーパー管理者が確認します。
          </p>
        )}
        {error && <p className="error-text">{error}</p>}
      </div>
    );
  }

  // TRIAL or SUSPENDED: show payment method selection
  return (
    <div>
      {plan === "SUSPENDED" && (
        <p style={{ color: "var(--color-danger)", marginBottom: 12 }}>
          アカウントが停止されています。再度サブスクリプションを開始してください。
        </p>
      )}

      {bankRequested ? (
        <div style={{
          padding: 16,
          background: "var(--color-bg)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius)",
        }}>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>請求書を発行しました</p>
          <p style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>
            以下の口座にお振込みください。入金確認後、プランがアクティブになります。
          </p>
          <div style={{ marginTop: 12, padding: 12, background: "var(--color-surface)", borderRadius: 4, fontFamily: "monospace", fontSize: 13 }}>
            <div>銀行名: 三菱UFJ銀行</div>
            <div>支店名: 渋谷支店（店番: 150）</div>
            <div>口座種別: 普通</div>
            <div>口座番号: 1234567</div>
            <div>口座名義: カ）ワークフォースネクサス</div>
          </div>
        </div>
      ) : !selectedMethod ? (
        <>
          <p style={{ fontSize: 14, marginBottom: 16 }}>お支払い方法を選択してください:</p>
          <div style={{ display: "grid", gap: 12, maxWidth: 400 }}>
            <button
              onClick={() => setSelectedMethod("stripe")}
              disabled={loading}
              style={{
                padding: "16px",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius)",
                background: "var(--color-surface)",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <div style={{ fontWeight: 600 }}>クレジットカード（Stripe）</div>
              <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 4 }}>
                Visa / Mastercard / AMEX — 即時反映
              </div>
            </button>
            <button
              onClick={() => setSelectedMethod("payjp")}
              disabled={loading}
              style={{
                padding: "16px",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius)",
                background: "var(--color-surface)",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <div style={{ fontWeight: 600 }}>クレジットカード（PAY.JP）</div>
              <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 4 }}>
                JCB / Visa / Mastercard — 即時反映
              </div>
            </button>
            <button
              onClick={() => setSelectedMethod("bank")}
              disabled={loading}
              style={{
                padding: "16px",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius)",
                background: "var(--color-surface)",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <div style={{ fontWeight: 600 }}>銀行振込（請求書払い）</div>
              <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 4 }}>
                請求書を発行 → 振込確認後にアクティブ化
              </div>
            </button>
          </div>
        </>
      ) : selectedMethod === "stripe" ? (
        <div>
          <button onClick={() => setSelectedMethod(null)} className="btn-compact" style={{ marginBottom: 12 }}>
            ← 戻る
          </button>
          <h3 style={{ marginBottom: 12 }}>Stripe でお支払い</h3>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 4 }}>
              プロモーションコード（お持ちの場合）
            </label>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="text"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                placeholder="例: WELCOME2026"
                style={{ padding: "6px 8px", width: 200, fontFamily: "monospace" }}
              />
              {promoCode && (
                <span style={{ fontSize: 12, color: "var(--color-success)" }}>適用されます</span>
              )}
            </div>
          </div>
          <button onClick={handleStripeCheckout} disabled={loading} data-variant="primary">
            {loading ? "読み込み中..." : "Stripeで決済に進む"}
          </button>
        </div>
      ) : selectedMethod === "payjp" ? (
        <div>
          <button onClick={() => setSelectedMethod(null)} className="btn-compact" style={{ marginBottom: 12 }}>
            ← 戻る
          </button>
          <h3 style={{ marginBottom: 12 }}>PAY.JP でお支払い</h3>
          <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: 12 }}>
            カード情報を入力して決済を完了してください。
          </p>
          <PayjpCheckoutForm loading={loading} setLoading={setLoading} setError={setError} />
        </div>
      ) : (
        <div>
          <button onClick={() => setSelectedMethod(null)} className="btn-compact" style={{ marginBottom: 12 }}>
            ← 戻る
          </button>
          <h3 style={{ marginBottom: 12 }}>銀行振込（請求書払い）</h3>
          <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: 12 }}>
            請求書を発行します。指定口座に振り込み後、運営が入金確認を行います。
          </p>
          <button onClick={handleBankTransfer} disabled={loading} data-variant="primary">
            {loading ? "処理中..." : "請求書を発行する"}
          </button>
        </div>
      )}

      {error && <p className="error-text">{error}</p>}
    </div>
  );
}

function PayjpCheckoutForm({
  loading,
  setLoading,
  setError,
}: {
  loading: boolean;
  setLoading: (v: boolean) => void;
  setError: (v: string | null) => void;
}) {
  const [cardNumber, setCardNumber] = useState("");
  const [expMonth, setExpMonth] = useState("");
  const [expYear, setExpYear] = useState("");
  const [cvc, setCvc] = useState("");
  const [name, setName] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const publicKey = process.env.NEXT_PUBLIC_PAYJP_PUBLIC_KEY;
      if (!publicKey) {
        setError("PAY.JP公開鍵が設定されていません");
        return;
      }

      // Create token via PAY.JP API
      const tokenRes = await fetch("https://api.pay.jp/v1/tokens", {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(publicKey + ":")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          "card[number]": cardNumber.replace(/\s/g, ""),
          "card[exp_month]": expMonth,
          "card[exp_year]": expYear,
          "card[cvc]": cvc,
          "card[name]": name,
        }),
      });

      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || tokenData.error) {
        setError(tokenData.error?.message ?? "カード情報が正しくありません");
        return;
      }

      // Send token to our API
      const res = await fetch("/api/payjp/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenData.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "決済に失敗しました");
        return;
      }

      window.location.reload();
    } catch {
      setError("ネットワークエラーが発生しました。再度お試しください。");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = { padding: "8px", border: "1px solid var(--color-border)", borderRadius: 4, width: "100%" };

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12, maxWidth: 360 }}>
      <label style={{ display: "grid", gap: 4 }}>
        <span style={{ fontSize: 13 }}>カード番号</span>
        <input
          value={cardNumber}
          onChange={(e) => setCardNumber(e.target.value)}
          placeholder="4242 4242 4242 4242"
          required
          maxLength={19}
          style={inputStyle}
        />
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 13 }}>有効期限（月）</span>
          <input
            value={expMonth}
            onChange={(e) => setExpMonth(e.target.value)}
            placeholder="01"
            required
            maxLength={2}
            style={inputStyle}
          />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 13 }}>有効期限（年）</span>
          <input
            value={expYear}
            onChange={(e) => setExpYear(e.target.value)}
            placeholder="2028"
            required
            maxLength={4}
            style={inputStyle}
          />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 13 }}>CVC</span>
          <input
            value={cvc}
            onChange={(e) => setCvc(e.target.value)}
            placeholder="123"
            required
            maxLength={4}
            type="password"
            style={inputStyle}
          />
        </label>
      </div>
      <label style={{ display: "grid", gap: 4 }}>
        <span style={{ fontSize: 13 }}>カード名義（任意）</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="TARO YAMADA"
          style={inputStyle}
        />
      </label>
      <button type="submit" disabled={loading} data-variant="primary">
        {loading ? "処理中..." : "PAY.JPで決済する"}
      </button>
    </form>
  );
}
