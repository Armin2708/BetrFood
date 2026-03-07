import Providers from "../context/Providers";
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Providers>
      <Stack screenOptions={{ headerShown: false }}/>
    </Providers>
  )
}
