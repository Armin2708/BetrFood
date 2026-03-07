import { useContext } from "react";
import { Redirect } from "expo-router";
import { AuthContext } from "../context/AuthenticationContext";


export default function RootIndex() {
  const { user } = useContext(AuthContext);
  console.log(user)

  if (user) {
    return (<Redirect href="/feeds" />);
  }

  return (<Redirect href="/(onboarding)" />);
}
