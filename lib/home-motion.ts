import { gsap } from "gsap";

export function mountHomeMotion(root: HTMLElement) {
  const frame = root.querySelector<HTMLElement>(".cinematic-map-frame");
  let entrance: gsap.core.Timeline | undefined;
  const context = gsap.context(() => {
    const trace = root.querySelector<SVGPathElement>("[data-map-trace]");
    if (trace && frame && frame.getBoundingClientRect().top < window.innerHeight && window.scrollY < 120) {
      const length = trace.getTotalLength();
      entrance = gsap.timeline({ defaults: { ease: "power3.out" } });
      entrance.fromTo(trace, { strokeDasharray: length, strokeDashoffset: length, opacity: 1 }, { strokeDashoffset: 0, duration: .8 });
      entrance.fromTo("[data-hud-edge]", { scaleX: 0 }, { scaleX: 1, duration: .28, stagger: .065, transformOrigin: "left" }, .35);
      entrance.to(trace, { opacity: 0, duration: .35 }, 1);
    }
  }, root);

  const visibility = () => {
    if (document.hidden) {
      entrance?.pause();
    } else entrance?.resume();
  };
  document.addEventListener("visibilitychange", visibility);
  return () => {
    document.removeEventListener("visibilitychange", visibility);
    context.revert();
  };
}
