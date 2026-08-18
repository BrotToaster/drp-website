"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

type FormRuntime = {
  uploadBusy: boolean;
  setUploadBusy: (token: string, busy: boolean) => void;
};

const Context = createContext<FormRuntime>({ uploadBusy: false, setUploadBusy: () => undefined });

export function FormRuntimeProvider({ children }: { children: React.ReactNode }) {
  const tokens = useRef(new Set<string>());
  const [uploadBusy, setBusy] = useState(false);
  const setUploadBusy = useCallback((token: string, busy: boolean) => {
    if (busy) tokens.current.add(token);
    else tokens.current.delete(token);
    setBusy(tokens.current.size > 0);
  }, []);
  const value = useMemo(() => ({ uploadBusy, setUploadBusy }), [uploadBusy, setUploadBusy]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useFormRuntime() {
  return useContext(Context);
}
