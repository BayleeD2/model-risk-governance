import { redirect } from "next/navigation";

// Middleware redirects unauthenticated users to /login.
// Authenticated users are sent to /models.
export default function RootPage() {
  redirect("/models");
}
