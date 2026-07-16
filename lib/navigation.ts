export function isNavigationActive(pathname: string, target: string, exact = false) {
  if (target === "/") return pathname === "/";
  return exact ? pathname === target : pathname === target || pathname.startsWith(target + "/");
}