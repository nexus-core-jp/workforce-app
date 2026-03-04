import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const notificationEmail = process.env.NOTIFICATION_EMAIL;

export async function sendPasswordResetEmail(
  email: string,
  resetUrl: string,
  userName: string,
) {
  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("RESEND_API_KEY is required in production");
    }
    console.warn("[email] RESEND_API_KEY not set — skipping password reset email");
    return;
  }

  const resend = new Resend(apiKey);

  await resend.emails.send({
    from: "Workforce Nexus <noreply@workforce.app>",
    to: email,
    subject: "パスワードリセットのご案内",
    text: [
      `${userName} 様`,
      ``,
      `パスワードリセットのリクエストを受け付けました。`,
      `以下のリンクから新しいパスワードを設定してください。`,
      ``,
      resetUrl,
      ``,
      `このリンクは1時間有効です。`,
      `心当たりがない場合は、このメールを無視してください。`,
    ].join("\n"),
  });
}

export async function sendEmailVerification(
  email: string,
  verifyUrl: string,
  companyName: string,
) {
  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("RESEND_API_KEY is required in production");
    }
    console.warn("[email] RESEND_API_KEY not set — skipping verification email");
    return;
  }

  const resend = new Resend(apiKey);

  await resend.emails.send({
    from: "Workforce Nexus <noreply@workforce.app>",
    to: email,
    subject: "メールアドレスの確認 - Workforce Nexus",
    text: [
      `${companyName} の管理者 様`,
      ``,
      `Workforce Nexus へのご登録ありがとうございます。`,
      `以下のリンクをクリックしてメールアドレスを確認してください。`,
      ``,
      verifyUrl,
      ``,
      `このリンクは24時間有効です。`,
      `心当たりがない場合は、このメールを無視してください。`,
    ].join("\n"),
  });
}

export async function sendWelcomeEmail(
  email: string,
  adminName: string,
  companyName: string,
  slug: string,
  _method: string = "email",
) {
  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("RESEND_API_KEY is required in production");
    }
    console.warn("[email] RESEND_API_KEY not set — skipping welcome email");
    return;
  }

  const resend = new Resend(apiKey);

  await resend.emails.send({
    from: "Workforce Nexus <noreply@workforce.app>",
    to: email,
    subject: "ようこそ Workforce Nexus へ",
    text: [
      `${adminName} 様`,
      ``,
      `${companyName} の Workforce Nexus への登録が完了しました。`,
      `会社ID: ${slug}`,
      ``,
      `以下のURLからログインできます:`,
      `${process.env.AUTH_URL || "http://localhost:3002"}/login`,
    ].join("\n"),
  });
}

export async function sendRegistrationNotification(
  tenantName: string,
  slug: string,
  adminEmail: string,
) {
  if (!apiKey || !notificationEmail) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("RESEND_API_KEY and NOTIFICATION_EMAIL are required in production");
    }
    console.warn(
      "[email] RESEND_API_KEY or NOTIFICATION_EMAIL not set — skipping notification",
    );
    return;
  }

  const resend = new Resend(apiKey);

  await resend.emails.send({
    from: "Workforce Nexus <noreply@workforce.app>",
    to: notificationEmail,
    subject: `新規登録: ${tenantName} (${slug})`,
    text: [
      `新しい企業が登録されました。`,
      ``,
      `会社名: ${tenantName}`,
      `会社ID: ${slug}`,
      `管理者メール: ${adminEmail}`,
      `登録日時: ${new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}`,
    ].join("\n"),
  });
}
