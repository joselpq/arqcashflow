import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login"
  }
});

export const config = {
  matcher: [
    "/contracts",
    "/receivables",
    "/expenses",
    "/ai-chat",
    "/onboarding"
  ]
};