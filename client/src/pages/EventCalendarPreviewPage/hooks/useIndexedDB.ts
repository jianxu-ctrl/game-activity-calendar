import { useEffect, useState } from "react";
import { openDB } from "../cache";

export function useIndexedDB() {
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(!!window.indexedDB);
  }, []);

  return { supported, openDB };
}
