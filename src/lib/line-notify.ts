const LINE_NOTIFY_TOKEN = process.env.LINE_NOTIFY_TOKEN;

export async function sendLineNotify(message: string): Promise<boolean> {
  if (!LINE_NOTIFY_TOKEN) return false;

  try {
    const res = await fetch("https://notify-api.line.me/api/notify", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LINE_NOTIFY_TOKEN}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ message }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
