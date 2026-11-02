import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { decodeScrollHash, registerScrollDriver, scrollToTarget } from "@/lib/scroll-navigation";

export function mountSiteScroll() {
  const lenis = new Lenis({
    autoRaf: false, lerp: .22, smoothWheel: true, syncTouch: false,
    allowNestedScroll: true, anchors: false, respectReducedMotion: true,
    stopInertiaOnNavigate: true,
    prevent: node => Boolean(node.closest('input,textarea,select,[data-lenis-prevent],[role="dialog"],[role="listbox"],.command-backdrop,.portal-drawer-backdrop')),
  });
  let frame: number | null = null;
  const tick = (time: number) => {
    lenis.raf(time);
    frame = lenis.isScrolling === "smooth" ? requestAnimationFrame(tick) : null;
  };
  const wake = () => { if (frame === null && !document.hidden) frame = requestAnimationFrame(tick); };
  const offWheel = lenis.on("virtual-scroll", wake);
  const unregister = registerScrollDriver((target, immediate) => {
    lenis.resize();
    lenis.scrollTo(target, { immediate, duration: .48, lerp: 0, easing: t => 1 - Math.pow(1 - t, 4) });
    if (!immediate) wake();
  });
  const anchor = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href*="#"]') : null;
    if (!link || link.target || link.hasAttribute("download")) return;
    const url = new URL(link.href);
    if (url.origin !== location.origin || url.pathname !== location.pathname || url.search !== location.search) return;
    const id = decodeScrollHash(url.hash);
    const target = id ? document.getElementById(id) : null;
    if (!target && id !== "top") return;
    event.preventDefault();
    if (url.hash !== location.hash) history.pushState(history.state, "", url);
    scrollToTarget(target || 0);
    if (target && (target.matches("a,button,input,select,textarea,[tabindex]") || target.id === "main-content")) {
      if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    }
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  };
  const visibility = () => {
    if (!document.hidden) return;
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    lenis.scrollTo(lenis.actualScroll, { immediate: true });
  };
  const keyboard = (event: KeyboardEvent) => {
    if (!["PageDown", "PageUp", "Home", "End", "ArrowDown", "ArrowUp", " "].includes(event.key) && !((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k")) return;
    if (event.target instanceof Element && event.target.closest('input,textarea,select,[contenteditable="true"]')) return;
    lenis.scrollTo(lenis.actualScroll, { immediate: true });
  };
  const control = (event: PointerEvent) => {
    if (event.button === 0 && event.target instanceof Element && event.target.closest('button,input,select,textarea,[contenteditable="true"]')) {
      lenis.scrollTo(lenis.actualScroll, { immediate: true });
    }
  };
  document.addEventListener("click", anchor);
  document.addEventListener("keydown", keyboard);
  document.addEventListener("pointerdown", control);
  const lock = () => { if (document.documentElement.classList.contains("drp-scroll-locked")) lenis.stop(); else lenis.start(); };
  window.addEventListener("drp:scroll-lock", lock);
  lock();
  document.addEventListener("visibilitychange", visibility);
  return () => {
    offWheel?.(); unregister();
    if (frame !== null) cancelAnimationFrame(frame);
    document.removeEventListener("click", anchor);
    document.removeEventListener("keydown", keyboard);
    document.removeEventListener("pointerdown", control);
    window.removeEventListener("drp:scroll-lock", lock);
    document.removeEventListener("visibilitychange", visibility);
    lenis.destroy();
  };
}
