import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const pathname = req.nextUrl.pathname;

    // Redirect old individual pages to new Projetos sub-tabs
    if (pathname === '/contracts') {
      const url = req.nextUrl.clone();
      url.pathname = '/projetos';
      url.searchParams.set('tab', 'contratos');
      return NextResponse.redirect(url);
    }

    if (pathname === '/receivables') {
      const url = req.nextUrl.clone();
      url.pathname = '/projetos';
      url.searchParams.set('tab', 'recebiveis');
      return NextResponse.redirect(url);
    }

    if (pathname === '/expenses') {
      const url = req.nextUrl.clone();
      url.pathname = '/projetos';
      url.searchParams.set('tab', 'despesas');
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  },
  {
    pages: {
      signIn: "/login"
    }
  }
);

export const config = {
  matcher: [
    "/contracts",
    "/receivables",
    "/expenses",
    "/projetos",
    "/ai-chat",
    "/onboarding"
  ]
};