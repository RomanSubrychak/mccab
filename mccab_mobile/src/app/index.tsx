import { Redirect } from "expo-router";

import { nextRoute, useSession } from "@/lib/session";

// Sends the user to sign in, the terms, the role choice, or home, depending on how far they got.
export default function Index() {
  const { session } = useSession();
  return <Redirect href={nextRoute(session)} />;
}
