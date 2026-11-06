import { Redirect } from "expo-router";

// No session handling yet, so the app always starts at the login screen.
export default function Index() {
  return <Redirect href="/login" />;
}
