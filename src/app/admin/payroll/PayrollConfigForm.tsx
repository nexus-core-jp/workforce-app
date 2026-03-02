"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface PayrollConfigData {
  userId: string;
  payType: "MONTHLY" | "HOURLY" | "DAILY";
  baseSalary: number;
  hourlyRate: number;
  commuteAllowance: number;
  housingAllowance: number;
  familyAllowance: number;
  otherAllowance: number;
  otherAllowanceLabel: string;
  scheduledWorkDays: number;
  scheduledWorkMinutes: number;
  overtimeRate: number;
  lateNightRate: number;
  holidayRate: number;
  bankName: string;
  bankCode: string;
  branchName: string;
  branchCode: string;
  accountType: string;
  accountNumber: string;
  accountHolder: string;
}

interface UserOption {
  id: string;
  name: string | null;
  email: string;
}

interface ExistingConfig extends PayrollConfigData {
  id: string;
  userName: string;
  userEmail: string;
}

export function PayrollConfigForm({
  users,
  existingConfigs,
}: {
  users: UserOption[];
  existingConfigs: ExistingConfig[];
}) {
  const router = useRouter();
  const [selectedUserId, setSelectedUserId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const defaults: Omit<PayrollConfigData, "userId"> = {
    payType: "MONTHLY",
    baseSalary: 0,
    hourlyRate: 0,
    commuteAllowance: 0,
    housingAllowance: 0,
    familyAllowance: 0,
    otherAllowance: 0,
    otherAllowanceLabel: "",
    scheduledWorkDays: 20,
    scheduledWorkMinutes: 480,
    overtimeRate: 1.25,
    lateNightRate: 1.5,
    holidayRate: 1.35,
    bankName: "",
    bankCode: "",
    branchName: "",
    branchCode: "",
    accountType: "普通",
    accountNumber: "",
    accountHolder: "",
  };

  const existing = existingConfigs.find((c) => c.userId === selectedUserId);
  const [form, setForm] = useState<Omit<PayrollConfigData, "userId">>(defaults);

  // When user selection changes, load existing config or reset to defaults
  const handleUserChange = (userId: string) => {
    setSelectedUserId(userId);
    setError(null);
    setSuccess(null);
    const cfg = existingConfigs.find((c) => c.userId === userId);
    if (cfg) {
      setForm({
        payType: cfg.payType,
        baseSalary: cfg.baseSalary,
        hourlyRate: cfg.hourlyRate,
        commuteAllowance: cfg.commuteAllowance,
        housingAllowance: cfg.housingAllowance,
        familyAllowance: cfg.familyAllowance,
        otherAllowance: cfg.otherAllowance,
        otherAllowanceLabel: cfg.otherAllowanceLabel,
        scheduledWorkDays: cfg.scheduledWorkDays,
        scheduledWorkMinutes: cfg.scheduledWorkMinutes,
        overtimeRate: cfg.overtimeRate,
        lateNightRate: cfg.lateNightRate,
        holidayRate: cfg.holidayRate,
        bankName: cfg.bankName,
        bankCode: cfg.bankCode,
        branchName: cfg.branchName,
        branchCode: cfg.branchCode,
        accountType: cfg.accountType,
        accountNumber: cfg.accountNumber,
        accountHolder: cfg.accountHolder,
      });
    } else {
      setForm(defaults);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/admin/payroll/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUserId, ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "保存に失敗しました");
      setSuccess("保存しました");
      router.refresh(); // Refresh server data (configured/unconfigured counts, labels)
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const setField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const inputStyle = { width: "100%", padding: "6px 8px" } as const;
  const labelStyle = { display: "block", marginBottom: 4, fontSize: 13, color: "var(--color-text-secondary)" } as const;

  return (
    <div>
      {/* User selection */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>対象社員</label>
        <select
          value={selectedUserId}
          onChange={(e) => handleUserChange(e.target.value)}
          style={{ ...inputStyle, maxWidth: 400 }}
        >
          <option value="">-- 社員を選択 --</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name ?? u.email}
              {existingConfigs.some((c) => c.userId === u.id) ? " (設定済)" : ""}
            </option>
          ))}
        </select>
      </div>

      {selectedUserId && (
        <form onSubmit={handleSubmit}>
          {/* Pay type & base salary */}
          <fieldset style={{ border: "1px solid var(--color-border)", padding: 16, marginBottom: 16 }}>
            <legend>基本給与</legend>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>給与形態</label>
                <select
                  value={form.payType}
                  onChange={(e) => setField("payType", e.target.value as PayrollConfigData["payType"])}
                  style={inputStyle}
                >
                  <option value="MONTHLY">月給</option>
                  <option value="HOURLY">時給</option>
                  <option value="DAILY">日給</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>
                  {form.payType === "MONTHLY" ? "月給 (円)" : form.payType === "DAILY" ? "日給 (円)" : "時給 (円)"}
                </label>
                <input
                  type="number"
                  value={form.payType === "HOURLY" ? form.hourlyRate : form.baseSalary}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    if (form.payType === "HOURLY") {
                      setField("hourlyRate", val);
                    } else {
                      setField("baseSalary", val);
                    }
                  }}
                  style={inputStyle}
                  min={0}
                />
              </div>
              <div>
                <label style={labelStyle}>所定労働日数/月</label>
                <input
                  type="number"
                  value={form.scheduledWorkDays}
                  onChange={(e) => setField("scheduledWorkDays", parseInt(e.target.value) || 20)}
                  style={inputStyle}
                  min={1}
                  max={31}
                />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 12 }}>
              <div>
                <label style={labelStyle}>所定労働時間/日 (分)</label>
                <input
                  type="number"
                  value={form.scheduledWorkMinutes}
                  onChange={(e) => setField("scheduledWorkMinutes", parseInt(e.target.value) || 480)}
                  style={inputStyle}
                  min={1}
                  max={1440}
                />
              </div>
            </div>
          </fieldset>

          {/* Allowances */}
          <fieldset style={{ border: "1px solid var(--color-border)", padding: 16, marginBottom: 16 }}>
            <legend>手当</legend>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>通勤手当 (円/月)</label>
                <input
                  type="number"
                  value={form.commuteAllowance}
                  onChange={(e) => setField("commuteAllowance", parseInt(e.target.value) || 0)}
                  style={inputStyle}
                  min={0}
                />
              </div>
              <div>
                <label style={labelStyle}>住宅手当 (円/月)</label>
                <input
                  type="number"
                  value={form.housingAllowance}
                  onChange={(e) => setField("housingAllowance", parseInt(e.target.value) || 0)}
                  style={inputStyle}
                  min={0}
                />
              </div>
              <div>
                <label style={labelStyle}>家族手当 (円/月)</label>
                <input
                  type="number"
                  value={form.familyAllowance}
                  onChange={(e) => setField("familyAllowance", parseInt(e.target.value) || 0)}
                  style={inputStyle}
                  min={0}
                />
              </div>
              <div>
                <label style={labelStyle}>その他手当 (円/月)</label>
                <input
                  type="number"
                  value={form.otherAllowance}
                  onChange={(e) => setField("otherAllowance", parseInt(e.target.value) || 0)}
                  style={inputStyle}
                  min={0}
                />
              </div>
            </div>
            {form.otherAllowance > 0 && (
              <div style={{ marginTop: 8 }}>
                <label style={labelStyle}>その他手当の名称</label>
                <input
                  type="text"
                  value={form.otherAllowanceLabel}
                  onChange={(e) => setField("otherAllowanceLabel", e.target.value)}
                  style={{ ...inputStyle, maxWidth: 300 }}
                  placeholder="例: 職務手当"
                />
              </div>
            )}
          </fieldset>

          {/* Premium rates */}
          <fieldset style={{ border: "1px solid var(--color-border)", padding: 16, marginBottom: 16 }}>
            <legend>割増率</legend>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>残業割増率</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.overtimeRate}
                  onChange={(e) => setField("overtimeRate", parseFloat(e.target.value) || 1.25)}
                  style={inputStyle}
                  min={1}
                  max={3}
                />
              </div>
              <div>
                <label style={labelStyle}>深夜割増率</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.lateNightRate}
                  onChange={(e) => setField("lateNightRate", parseFloat(e.target.value) || 1.5)}
                  style={inputStyle}
                  min={1}
                  max={3}
                />
              </div>
              <div>
                <label style={labelStyle}>休日割増率</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.holidayRate}
                  onChange={(e) => setField("holidayRate", parseFloat(e.target.value) || 1.35)}
                  style={inputStyle}
                  min={1}
                  max={3}
                />
              </div>
            </div>
          </fieldset>

          {/* Bank info */}
          <fieldset style={{ border: "1px solid var(--color-border)", padding: 16, marginBottom: 16 }}>
            <legend>振込先口座</legend>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>銀行名</label>
                <input
                  type="text"
                  value={form.bankName}
                  onChange={(e) => setField("bankName", e.target.value)}
                  style={inputStyle}
                  placeholder="例: みずほ銀行"
                />
              </div>
              <div>
                <label style={labelStyle}>銀行コード (4桁)</label>
                <input
                  type="text"
                  value={form.bankCode}
                  onChange={(e) => setField("bankCode", e.target.value)}
                  style={inputStyle}
                  maxLength={4}
                  placeholder="0001"
                />
              </div>
              <div>
                <label style={labelStyle}>支店名</label>
                <input
                  type="text"
                  value={form.branchName}
                  onChange={(e) => setField("branchName", e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginTop: 12 }}>
              <div>
                <label style={labelStyle}>支店コード (3桁)</label>
                <input
                  type="text"
                  value={form.branchCode}
                  onChange={(e) => setField("branchCode", e.target.value)}
                  style={inputStyle}
                  maxLength={3}
                  placeholder="001"
                />
              </div>
              <div>
                <label style={labelStyle}>預金種目</label>
                <select
                  value={form.accountType}
                  onChange={(e) => setField("accountType", e.target.value)}
                  style={inputStyle}
                >
                  <option value="普通">普通</option>
                  <option value="当座">当座</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>口座番号 (7桁)</label>
                <input
                  type="text"
                  value={form.accountNumber}
                  onChange={(e) => setField("accountNumber", e.target.value)}
                  style={inputStyle}
                  maxLength={7}
                  placeholder="1234567"
                />
              </div>
              <div>
                <label style={labelStyle}>口座名義 (カナ)</label>
                <input
                  type="text"
                  value={form.accountHolder}
                  onChange={(e) => setField("accountHolder", e.target.value)}
                  style={inputStyle}
                  placeholder="ヤマダ タロウ"
                />
              </div>
            </div>
          </fieldset>

          {error && <p style={{ color: "var(--color-error, #c00)", marginBottom: 8 }}>{error}</p>}
          {success && <p style={{ color: "var(--color-success, #080)", marginBottom: 8 }}>{success}</p>}

          <button type="submit" disabled={saving} style={{ padding: "8px 24px" }}>
            {saving ? "保存中..." : existing ? "更新する" : "登録する"}
          </button>
        </form>
      )}
    </div>
  );
}
