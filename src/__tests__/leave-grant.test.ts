import { describe, it, expect } from "vitest";

import {
  computeDuePlans,
  computeComplianceStatus,
} from "@/lib/leave-grant";

/** JST midnight helper — mirrors startOfJstDay semantics for test fixtures. */
function jst(ymd: string): Date {
  // startOfJstDay stores JST midnight as UTC-09:00 on the previous day.
  // For test purposes we only care about equality, so construct via Date.UTC.
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, -9, 0, 0, 0));
}

describe("computeDuePlans", () => {
  it("付与タイミング前のユーザーには付与プランを作らない", () => {
    const users = [{ id: "u1", hireDate: jst("2026-01-01"), retiredAt: null }];
    const plans = computeDuePlans(users, [], jst("2026-04-01")); // 3ヶ月経過
    expect(plans).toHaveLength(0);
  });

  it("入社6ヶ月経過で10日の付与プランを返す", () => {
    const users = [{ id: "u1", hireDate: jst("2025-10-01"), retiredAt: null }];
    const plans = computeDuePlans(users, [], jst("2026-04-02"));
    expect(plans).toHaveLength(1);
    expect(plans[0].days).toBe(10);
    expect(plans[0].userId).toBe("u1");
  });

  it("既に同じ付与が存在する場合は冪等に重複付与しない", () => {
    const users = [{ id: "u1", hireDate: jst("2025-10-01"), retiredAt: null }];
    const existing = [
      { userId: "u1", effectiveDate: jst("2026-04-01"), days: 10 },
    ];
    const plans = computeDuePlans(users, existing, jst("2026-04-02"));
    expect(plans).toHaveLength(0);
  });

  it("複数段階(6ヶ月,1年6ヶ月)に到達した分を全て返す", () => {
    const users = [{ id: "u1", hireDate: jst("2024-01-01"), retiredAt: null }];
    const plans = computeDuePlans(users, [], jst("2026-04-01"));
    // 6ヶ月(10) + 1年6ヶ月(11) = 2件
    expect(plans).toHaveLength(2);
    expect(plans.map((p) => p.days).sort()).toEqual([10, 11]);
  });

  it("退職済みユーザーには付与しない", () => {
    const users = [
      { id: "u1", hireDate: jst("2025-01-01"), retiredAt: jst("2026-03-01") },
    ];
    const plans = computeDuePlans(users, [], jst("2026-04-01"));
    expect(plans).toHaveLength(0);
  });

  it("入社日がないユーザーは付与対象外", () => {
    const users = [{ id: "u1", hireDate: null, retiredAt: null }];
    const plans = computeDuePlans(users, [], jst("2026-04-01"));
    expect(plans).toHaveLength(0);
  });
});

describe("computeComplianceStatus", () => {
  it("10日未満の付与しか受けていないユーザーは対象外", () => {
    const status = computeComplianceStatus(
      "u1",
      [{ days: 5, effectiveDate: jst("2026-01-01") }],
      [],
      jst("2026-04-01"),
    );
    expect(status.subjectTo5DayRule).toBe(false);
    expect(status.level).toBe("ok");
  });

  it("10日付与から1年以内に5日以上取得している場合はok", () => {
    const status = computeComplianceStatus(
      "u1",
      [{ days: 10, effectiveDate: jst("2026-01-01") }],
      [
        { days: 3, effectiveDate: jst("2026-02-01") },
        { days: 2, effectiveDate: jst("2026-03-01") },
      ],
      jst("2026-04-01"),
    );
    expect(status.usedInPeriod).toBe(5);
    expect(status.daysShort).toBe(0);
    expect(status.level).toBe("ok");
  });

  it("期限3ヶ月前で5日未達なら warning", () => {
    // 付与: 2025-06-01、期限: 2026-06-01、今日: 2026-04-01 (残約60日)
    const status = computeComplianceStatus(
      "u1",
      [{ days: 10, effectiveDate: jst("2025-06-01") }],
      [{ days: 2, effectiveDate: jst("2025-08-01") }],
      jst("2026-04-01"),
    );
    expect(status.usedInPeriod).toBe(2);
    expect(status.daysShort).toBe(3);
    expect(status.level).toBe("warning");
  });

  it("期限超過で5日未達なら violation", () => {
    // 付与: 2024-06-01、期限: 2025-06-01、今日: 2026-04-01
    const status = computeComplianceStatus(
      "u1",
      [{ days: 10, effectiveDate: jst("2024-06-01") }],
      [{ days: 1, effectiveDate: jst("2024-10-01") }],
      jst("2026-04-01"),
    );
    expect(status.level).toBe("violation");
  });

  it("直近の付与を参照する(古い付与は無視)", () => {
    const status = computeComplianceStatus(
      "u1",
      [
        { days: 10, effectiveDate: jst("2024-06-01") },
        { days: 11, effectiveDate: jst("2025-12-01") }, // 直近
      ],
      [
        { days: 6, effectiveDate: jst("2024-08-01") }, // 古い付与期間の取得
      ],
      jst("2026-03-01"),
    );
    // 直近付与(2025-12-01)以降の取得は 0 日
    expect(status.usedInPeriod).toBe(0);
    expect(status.daysShort).toBe(5);
  });
});
