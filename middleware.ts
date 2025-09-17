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
    "/alerts",
    "/ai-chat"
  ]
};