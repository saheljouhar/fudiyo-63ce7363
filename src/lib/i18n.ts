import { useEffect, useState } from "react";

type Lang = "en" | "ml";

const dict: Record<string, { en: string; ml: string }> = {
  signIn: { en: "Sign in", ml: "സൈൻ ഇൻ" },
  email: { en: "Email", ml: "ഇമെയിൽ" },
  password: { en: "Password", ml: "പാസ്‌വേഡ്" },
  dashboard: { en: "Dashboard", ml: "ഡാഷ്ബോർഡ്" },
  tables: { en: "Tables", ml: "ടേബിളുകൾ" },
  orders: { en: "Orders", ml: "ഓർഡറുകൾ" },
  kitchen: { en: "Kitchen", ml: "അടുക്കള" },
  history: { en: "Order History", ml: "ഓർഡർ ചരിത്രം" },
  menu: { en: "Menu", ml: "മെനു" },
  bookings: { en: "Bookings", ml: "ബുക്കിംഗുകൾ" },
  staff: { en: "Staff", ml: "ജീവനക്കാർ" },
  reports: { en: "Reports", ml: "റിപ്പോർട്ടുകൾ" },
  settings: { en: "Settings", ml: "ക്രമീകരണങ്ങൾ" },
  logout: { en: "Log out", ml: "ലോഗൗട്ട്" },
};

export function getLang(): Lang {
  if (typeof window === "undefined") return "en";
  return ((localStorage.getItem("orbis.lang") as Lang) || "en");
}
export function setLang(l: Lang) {
  if (typeof window === "undefined") return;
  localStorage.setItem("orbis.lang", l);
  window.dispatchEvent(new Event("orbis-lang"));
}
export function useLang(): [Lang, (l: Lang) => void] {
  const [lang, setL] = useState<Lang>(getLang);
  useEffect(() => {
    const h = () => setL(getLang());
    window.addEventListener("orbis-lang", h);
    return () => window.removeEventListener("orbis-lang", h);
  }, []);
  return [lang, setLang];
}
export function t(key: keyof typeof dict, lang?: Lang): string {
  const l = lang ?? getLang();
  return dict[key]?.[l] ?? key;
}