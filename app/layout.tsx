import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthProvider from "./components/AuthProvider";
import NavBar from "./components/NavBar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ArqCashflow - Controle Financeiro Simples para Arquitetos",
  description: "Sistema de controle financeiro para arquitetos, advogados e profissionais liberais. Organize suas finanças em 5 minutos, sem complicação. Assistente IA incluído.",
  keywords: "controle financeiro, arquitetos, advogados, médicos, fluxo de caixa, gestão financeira, IA, Brasil",
  authors: [{ name: "ArqCashflow" }],
  openGraph: {
    title: "ArqCashflow - Pare de viver ansioso com suas finanças",
    description: "Para arquitetos e profissionais que querem controle financeiro sem complicação. Setup em 5 minutos.",
    type: "website",
    locale: "pt_BR",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <NavBar />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
