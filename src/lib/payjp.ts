import Payjp from "payjp";

let _payjp: ReturnType<typeof Payjp> | null = null;

export function getPayjp() {
  if (!_payjp) {
    const key = process.env.PAYJP_SECRET_KEY;
    if (!key) {
      throw new Error("PAYJP_SECRET_KEY is not set");
    }
    _payjp = Payjp(key);
  }
  return _payjp;
}
