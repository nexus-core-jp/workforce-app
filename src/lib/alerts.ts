import { logger } from "@/lib/logger";

const slackWebhookUrl = process.env.SLACK_ALERT_WEBHOOK_URL;

interface AlertPayload {
  level: "info" | "warning" | "critical";
  title: string;
  message: string;
  context?: Record<string, unknown>;
}

/**
 * Send an alert to the configured Slack channel.
 * Non-blocking: always fire-and-forget.
 */
export function sendAlert(payload: AlertPayload) {
  if (!slackWebhookUrl) {
    logger.warn("[alerts] SLACK_ALERT_WEBHOOK_URL not set — skipping alert", {
      title: payload.title,
    });
    return;
  }

  const emoji =
    payload.level === "critical"
      ? ":rotating_light:"
      : payload.level === "warning"
        ? ":warning:"
        : ":information_source:";

  const color =
    payload.level === "critical"
      ? "#dc2626"
      : payload.level === "warning"
        ? "#f59e0b"
        : "#3b82f6";

  const body = {
    attachments: [
      {
        color,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `${emoji} *${payload.title}*\n${payload.message}`,
            },
          },
          ...(payload.context
            ? [
                {
                  type: "context",
                  elements: [
                    {
                      type: "mrkdwn",
                      text: Object.entries(payload.context)
                        .map(([k, v]) => `*${k}:* ${v}`)
                        .join(" | "),
                    },
                  ],
                },
              ]
            : []),
        ],
      },
    ],
  };

  fetch(slackWebhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch((err) => {
    logger.error("[alerts] Failed to send Slack alert", {}, err);
  });
}

// Convenience helpers
export function alertPaymentFailed(tenantName: string, tenantId: string) {
  sendAlert({
    level: "critical",
    title: "支払い失敗",
    message: `テナント「${tenantName}」の支払いが失敗しました。テナントは SUSPENDED に変更されました。`,
    context: { tenantId },
  });
}

export function alertHighErrorRate(endpoint: string, errorCount: number) {
  sendAlert({
    level: "warning",
    title: "エラーレート上昇",
    message: `${endpoint} で直近15分間に ${errorCount} 件のエラーが発生しています。`,
    context: { endpoint, errorCount },
  });
}

export function alertTrialExpiring(tenantName: string, daysLeft: number) {
  sendAlert({
    level: "info",
    title: "トライアル期限",
    message: `テナント「${tenantName}」のトライアルが残り ${daysLeft} 日で終了します。`,
    context: { tenantName, daysLeft },
  });
}
