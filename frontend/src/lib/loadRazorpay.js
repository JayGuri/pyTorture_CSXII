const RZP_SRC = "https://checkout.razorpay.com/v1/checkout.js";

/**
 * @returns {Promise<boolean>}
 */
export function loadRazorpayScript() {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);

  return new Promise((resolve) => {
    const existing = document.querySelector(`script[src="${RZP_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(Boolean(window.Razorpay)), { once: true });
      existing.addEventListener("error", () => resolve(false), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = RZP_SRC;
    script.async = true;
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function getRazorpayKeyId() {
  return (
    import.meta.env?.VITE_RAZORPAY_KEY_ID ||
    import.meta.env?.VITE_RAZORPAY_ID ||
    ""
  );
}
