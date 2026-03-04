/**
 * k6 負荷テストスクリプト
 *
 * 実行方法:
 *   k6 run k6/load-test.js
 *
 * 環境変数:
 *   BASE_URL  - テスト対象URL (default: http://localhost:3002)
 *   TENANT    - テナントslug (default: demo)
 *   EMAIL     - ログイン用メール
 *   PASSWORD  - ログイン用パスワード
 */
import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3002";
const TENANT = __ENV.TENANT || "demo";
const EMAIL = __ENV.EMAIL || "admin@example.com";
const PASSWORD = __ENV.PASSWORD || "password123";

// Custom metrics
const errorRate = new Rate("errors");
const loginDuration = new Trend("login_duration");
const apiDuration = new Trend("api_duration");

// Test scenarios
export const options = {
  scenarios: {
    // Smoke test: minimal load
    smoke: {
      executor: "constant-vus",
      vus: 1,
      duration: "30s",
      tags: { scenario: "smoke" },
      startTime: "0s",
    },
    // Load test: normal expected load
    load: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "1m", target: 20 },  // Ramp up
        { duration: "3m", target: 20 },  // Stay at 20 users
        { duration: "1m", target: 50 },  // Ramp to 50
        { duration: "3m", target: 50 },  // Stay at 50
        { duration: "1m", target: 0 },   // Ramp down
      ],
      tags: { scenario: "load" },
      startTime: "30s",
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<2000", "p(99)<5000"],  // 95% < 2s, 99% < 5s
    errors: ["rate<0.05"],  // Error rate < 5%
    login_duration: ["p(95)<3000"],
    api_duration: ["p(95)<1500"],
  },
};

// Helper: get CSRF token and login
function login() {
  const loginRes = http.post(
    `${BASE_URL}/api/auth/callback/credentials`,
    JSON.stringify({
      tenant: TENANT,
      email: EMAIL,
      password: PASSWORD,
    }),
    {
      headers: { "Content-Type": "application/json" },
      redirects: 0,
    },
  );

  loginDuration.add(loginRes.timings.duration);
  return loginRes;
}

export default function () {
  group("Health Check", () => {
    const res = http.get(`${BASE_URL}/api/health`);
    check(res, {
      "health status 200": (r) => r.status === 200,
      "health body ok": (r) => {
        try {
          return JSON.parse(r.body).status === "ok";
        } catch {
          return false;
        }
      },
    }) || errorRate.add(1);
    apiDuration.add(res.timings.duration);
  });

  sleep(0.5);

  group("Login Flow", () => {
    const loginRes = login();
    check(loginRes, {
      "login responds": (r) => r.status < 500,
    }) || errorRate.add(1);
  });

  sleep(0.5);

  group("Dashboard Page", () => {
    const res = http.get(`${BASE_URL}/dashboard`);
    check(res, {
      "dashboard loads": (r) => r.status === 200 || r.status === 302,
    }) || errorRate.add(1);
    apiDuration.add(res.timings.duration);
  });

  sleep(0.5);

  group("Time Entries API", () => {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const res = http.get(`${BASE_URL}/api/time-entries?month=${month}`);
    check(res, {
      "time entries responds": (r) => r.status < 500,
    }) || errorRate.add(1);
    apiDuration.add(res.timings.duration);
  });

  sleep(0.5);

  group("Leave Requests API", () => {
    const res = http.get(`${BASE_URL}/api/leave-requests`);
    check(res, {
      "leave requests responds": (r) => r.status < 500,
    }) || errorRate.add(1);
    apiDuration.add(res.timings.duration);
  });

  sleep(1);
}

export function handleSummary(data) {
  return {
    stdout: textSummary(data, { indent: "  ", enableColors: true }),
    "k6/results.json": JSON.stringify(data),
  };
}

function textSummary(data, options) {
  // k6 provides a built-in text summary
  return "";
}
