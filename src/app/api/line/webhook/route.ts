import { NextResponse } from "next/server";
import crypto from "crypto";

import { prisma } from "@/lib/db";
import { diffMinutes, startOfJstDay } from "@/lib/time";
import { isMonthClosed } from "@/lib/close";

const CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET ?? "";

function verifySignature(body: string, signature: string): boolean {
  if (!CHANNEL_SECRET) return false;
  const hash = crypto
    .createHmac("SHA256", CHANNEL_SECRET)
    .update(body)
    .digest("base64");
  return hash === signature;
}

interface LineEvent {
  type: string;
  replyToken: string;
  source: { userId: string; type: string };
  message?: { type: string; text: string };
}

async function replyMessage(replyToken: string, text: string) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return;

  await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: "text", text }],
    }),
  });
}

type PunchAction = "CLOCK_IN" | "BREAK_START" | "BREAK_END" | "CLOCK_OUT";

const PUNCH_MAP: Record<string, PunchAction> = {
  "出勤": "CLOCK_IN",
  "休憩開始": "BREAK_START",
  "休憩": "BREAK_START",
  "休憩終了": "BREAK_END",
  "退勤": "CLOCK_OUT",
};

function computeWorkMinutes(entry: {
  clockInAt: Date | null;
  clockOutAt: Date | null;
  breakStartAt: Date | null;
  breakEndAt: Date | null;
}): number {
  if (!entry.clockInAt || !entry.clockOutAt) return 0;
  const total = diffMinutes(entry.clockInAt, entry.clockOutAt);
  let breakMin = 0;
  if (entry.breakStartAt && entry.breakEndAt) {
    breakMin = Math.max(0, diffMinutes(entry.breakStartAt, entry.breakEndAt));
  }
  return Math.max(0, total - breakMin);
}

async function handlePunch(lineUserId: string, action: PunchAction): Promise<string> {
  // Find user by LINE account
  const account = await prisma.account.findFirst({
    where: { provider: "line", providerAccountId: lineUserId },
    include: { user: true },
  });

  if (!account?.user) {
    return "LINEアカウントが未連携です。Webからログインしてアカウントを連携してください。";
  }

  const user = account.user;
  const today = startOfJstDay(new Date());
  const now = new Date();

  if (await isMonthClosed(user.tenantId, today)) {
    return "当月は締め済みのため打刻できません。";
  }

  const entry = await prisma.timeEntry.upsert({
    where: { tenantId_userId_date: { tenantId: user.tenantId, userId: user.id, date: today } },
    create: { tenantId: user.tenantId, userId: user.id, date: today },
    update: {},
  });

  const next: Record<string, Date> = {};

  if (action === "CLOCK_IN") {
    if (entry.clockInAt) return "既に出勤済みです。";
    next.clockInAt = now;
  } else if (action === "BREAK_START") {
    if (!entry.clockInAt) return "先に出勤してください。";
    if (entry.breakStartAt) return "既に休憩中です。";
    next.breakStartAt = now;
  } else if (action === "BREAK_END") {
    if (!entry.breakStartAt) return "休憩を開始していません。";
    if (entry.breakEndAt) return "既に休憩終了済みです。";
    next.breakEndAt = now;
  } else if (action === "CLOCK_OUT") {
    if (!entry.clockInAt) return "先に出勤してください。";
    if (entry.clockOutAt) return "既に退勤済みです。";
    if (entry.breakStartAt && !entry.breakEndAt) return "休憩中のため退勤できません。休憩終了してください。";
    next.clockOutAt = now;
  }

  const updated = await prisma.timeEntry.update({
    where: { id: entry.id },
    data: {
      ...next,
      workMinutes: computeWorkMinutes({
        clockInAt: next.clockInAt ?? entry.clockInAt,
        clockOutAt: next.clockOutAt ?? entry.clockOutAt,
        breakStartAt: next.breakStartAt ?? entry.breakStartAt,
        breakEndAt: next.breakEndAt ?? entry.breakEndAt,
      }),
    },
  });

  const time = now.toLocaleTimeString("ja-JP", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit" });
  const labels: Record<PunchAction, string> = {
    CLOCK_IN: "出勤",
    BREAK_START: "休憩開始",
    BREAK_END: "休憩終了",
    CLOCK_OUT: "退勤",
  };

  let msg = `${labels[action]}しました (${time})`;
  if (action === "CLOCK_OUT") {
    msg += `\n本日の労働時間: ${updated.workMinutes}分`;
  }
  return msg;
}

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("x-line-signature") ?? "";

  if (CHANNEL_SECRET && !verifySignature(body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  const payload = JSON.parse(body) as { events: LineEvent[] };

  for (const event of payload.events) {
    if (event.type !== "message" || event.message?.type !== "text") continue;

    const text = event.message.text.trim();
    const action = PUNCH_MAP[text];

    if (action) {
      const reply = await handlePunch(event.source.userId, action);
      await replyMessage(event.replyToken, reply);
    } else if (text === "ヘルプ" || text === "help") {
      await replyMessage(
        event.replyToken,
        "打刻コマンド:\n・出勤\n・休憩開始（または休憩）\n・休憩終了\n・退勤\n\nメッセージを送信するだけで打刻できます。"
      );
    }
  }

  return NextResponse.json({ ok: true });
}
