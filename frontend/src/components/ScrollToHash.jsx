import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/** After navigation, scroll to #id when the URL contains a hash (e.g. /#register). */
export default function ScrollToHash() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) return;
    const id = hash.replace("#", "");
    if (!id) return;
    const t = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => window.clearTimeout(t);
  }, [pathname, hash]);

  return null;
}
