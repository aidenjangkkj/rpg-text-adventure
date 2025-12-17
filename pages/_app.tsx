import type { AppProps } from "next/app";
import { diphylleia } from "@/lib/fonts";
import "@/app/globals.css";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div className={`${diphylleia.className} ${diphylleia.variable}`}>
      <Component {...pageProps} />
    </div>
  );
}
