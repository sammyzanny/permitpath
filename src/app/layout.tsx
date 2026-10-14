import type { Metadata } from "next";
import "./globals.css";
import { APP_URL, BRAND, env } from "@/lib/env";
import { ClerkProvider } from "@clerk/nextjs";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: { default: `${BRAND} — contractor registration tracker for Chicago's south suburbs`, template: `%s · ${BRAND}` },
  description: "Every village's contractor registration rules — fees, bonds, insurance, expiry dates and how to submit — with one calendar and reminders so you never lose a permit day.",
  openGraph: { siteName: BRAND, type: "website" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const body = (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
  return env.clerk.configured ? <ClerkProvider>{body}</ClerkProvider> : body;
}
