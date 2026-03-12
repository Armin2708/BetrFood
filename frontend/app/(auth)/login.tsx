import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { useState, useCallback } from "react";
import { useRouter } from "expo-router";
import { useSignIn, useSSO } from "@clerk/clerk-expo";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

export default function Login() {
  if (Platform.OS === "web") {
    return <WebLogin />;
  }
  return <NativeLogin />;
}

function WebLogin() {
  const router = useRouter();
  const { signIn, setActive, isLoaded } = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingSecondFactor, setPendingSecondFactor] = useState(false);
  const [code, setCode] = useState("");

  const handleLogin = async () => {
    if (!isLoaded || !signIn) return;
    if (!email || !password) {
      window.alert("Please enter email and password.");
      return;
    }

    setLoading(true);
    try {
      const result = await signIn.create({ identifier: email, password });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/");
      } else if (result.status === "needs_second_factor") {
        await signIn.prepareSecondFactor({ strategy: "email_code" });
        setPendingSecondFactor(true);
      } else {
        window.alert("Additional verification steps required.");
      }
    } catch (error: any) {
      const msg =
        error.errors?.[0]?.longMessage ||
        error.errors?.[0]?.message ||
        error.message ||
        "Login failed";
      window.alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySecondFactor = async () => {
    if (!isLoaded || !signIn) return;
    setLoading(true);
    try {
      const result = await signIn.attemptSecondFactor({ strategy: "email_code", code });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/");
      } else {
        window.alert("Verification incomplete. Please try again.");
      }
    } catch (error: any) {
      const msg =
        error.errors?.[0]?.longMessage ||
        error.errors?.[0]?.message ||
        error.message ||
        "Verification failed";
      window.alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (strategy: "oauth_google" | "oauth_apple") => {
    if (!isLoaded || !signIn) return;
    setLoading(true);
    try {
      // Create the OAuth sign-in and get the redirect URL
      const result = await signIn.create({
        strategy,
        redirectUrl: window.location.origin + "/sso-callback",
        actionCompleteRedirectUrl: window.location.origin + "/",
      });

      const verificationUrl =
        result.firstFactorVerification?.externalVerificationRedirectURL;

      if (!verificationUrl) {
        throw new Error("No OAuth redirect URL returned from Clerk");
      }

      // Open OAuth in a popup window
      const popup = window.open(
        verificationUrl.toString(),
        "clerk-oauth",
        "width=500,height=600,left=200,top=100"
      );

      if (!popup) {
        throw new Error("Popup blocked. Please allow popups for this site.");
      }

      // Poll for popup close and check auth status
      const pollInterval = setInterval(async () => {
        try {
          if (popup.closed) {
            clearInterval(pollInterval);
            // Reload the sign-in to check if it completed
            const updatedSignIn = await signIn.reload();
            if (updatedSignIn.status === "complete") {
              await setActive({ session: updatedSignIn.createdSessionId });
              router.replace("/");
            } else {
              setLoading(false);
            }
          }
        } catch (pollError: any) {
          clearInterval(pollInterval);
          const pollMsg =
            pollError.errors?.[0]?.longMessage ||
            pollError.errors?.[0]?.message ||
            pollError.message ||
            "OAuth sign-in could not be completed";
          window.alert(pollMsg);
          setLoading(false);
        }
      }, 500);
    } catch (error: any) {
      console.error("OAuth error:", error);
      const msg =
        error.errors?.[0]?.longMessage ||
        error.errors?.[0]?.message ||
        error.message ||
        "OAuth sign-in failed";
      window.alert(msg);
      setLoading(false);
    }
  };

  if (pendingSecondFactor) {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <Text style={styles.title} accessibilityRole="header">Verify Your Identity</Text>
          <Text style={styles.subtitle}>
            We sent a verification code to {email}
          </Text>
          <TextInput
            placeholder="Verification code"
            onChangeText={setCode}
            value={code}
            keyboardType="number-pad"
            style={styles.input}
            accessibilityLabel="Verification code"
          />
          <TouchableOpacity
            style={styles.button}
            onPress={handleVerifySecondFactor}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Verify code"
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Verify</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        <Text style={styles.title} accessibilityRole="header">Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to your account</Text>

        <TouchableOpacity
          style={styles.oauthButton}
          onPress={() => handleOAuth("oauth_google")}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Continue with Google"
        >
          <Text style={styles.oauthButtonText}>Continue with Google</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.oauthButton, styles.appleButton]}
          onPress={() => handleOAuth("oauth_apple")}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Continue with Apple"
        >
          <Text style={[styles.oauthButtonText, styles.appleButtonText]}>
            Continue with Apple
          </Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <TextInput
          placeholder="Email"
          onChangeText={setEmail}
          value={email}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
          accessibilityLabel="Email address"
          accessibilityHint="Enter your email"
        />

        <TextInput
          placeholder="Password"
          secureTextEntry
          onChangeText={setPassword}
          value={password}
          style={styles.input}
          accessibilityLabel="Password"
          accessibilityHint="Enter your password"
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handleLogin}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Sign in"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => router.push("/signup")}
          accessibilityRole="link"
          accessibilityLabel="Don't have an account? Sign up"
        >
          <Text style={styles.linkText}>
            Don't have an account? <Text style={styles.linkBold}>Sign Up</Text>
          </Text>
        </TouchableOpacity>

        <Pressable onPress={() => router.push("/resetPassword")} accessibilityRole="link" accessibilityLabel="Forgot password">
          <Text style={styles.forgotPasswordText}>Forgot password?</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function NativeLogin() {
  const router = useRouter();
  const { signIn, setActive, isLoaded } = useSignIn();
  const { startSSOFlow } = useSSO();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingSecondFactor, setPendingSecondFactor] = useState(false);
  const [code, setCode] = useState("");

  const handleLogin = async () => {
    if (!isLoaded || !signIn) return;
    if (!email || !password) {
      Alert.alert("Error", "Please enter email and password.");
      return;
    }

    setLoading(true);
    try {
      const result = await signIn.create({
        identifier: email,
        password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/");
      } else if (result.status === "needs_second_factor") {
        await signIn.prepareSecondFactor({ strategy: "email_code" });
        setPendingSecondFactor(true);
      } else {
        Alert.alert("Error", "Additional verification steps required.");
      }
    } catch (error: any) {
      const msg =
        error.errors?.[0]?.longMessage ||
        error.errors?.[0]?.message ||
        error.message ||
        "Login failed";
      Alert.alert("Login Failed", msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySecondFactor = async () => {
    if (!isLoaded || !signIn) return;
    setLoading(true);
    try {
      const result = await signIn.attemptSecondFactor({ strategy: "email_code", code });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/");
      } else {
        Alert.alert("Error", "Verification incomplete. Please try again.");
      }
    } catch (error: any) {
      const msg =
        error.errors?.[0]?.longMessage ||
        error.errors?.[0]?.message ||
        error.message ||
        "Verification failed";
      Alert.alert("Verification Failed", msg);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = useCallback(
    async (strategy: "oauth_google" | "oauth_apple") => {
      if (!isLoaded) return;
      setLoading(true);
      try {
        const { createdSessionId, setActive: setActiveSession, signUp, signIn: ssoSignIn } =
          await startSSOFlow({
            strategy,
            redirectUrl: AuthSession.makeRedirectUri({ scheme: "betrfood" }),
          });

        if (createdSessionId) {
          await setActiveSession!({ session: createdSessionId });
          router.replace("/");
        } else if (signUp) {
          // New user — Clerk transferred signIn → signUp.
          // Username will be set during onboarding.
          const latest = signUp.status === "complete" ? signUp : await signUp.reload();
          if (latest.status === "complete" && latest.createdSessionId) {
            await setActiveSession!({ session: latest.createdSessionId });
            router.replace("/");
          } else {
            console.log("[OAuth] signUp still incomplete:", latest.status, latest.missingFields);
            Alert.alert("Sign In Incomplete", "Could not complete account creation. Please try signing up with email.");
          }
        } else {
          Alert.alert("Sign In Incomplete", "Additional verification steps may be required.");
        }
      } catch (error: any) {
        console.error("OAuth error:", JSON.stringify(error, null, 2));
        const msg =
          error.errors?.[0]?.longMessage ||
          error.errors?.[0]?.message ||
          error.message ||
          "OAuth sign-in failed";
        Alert.alert("Sign In Failed", msg);
      } finally {
        setLoading(false);
      }
    },
    [isLoaded, startSSOFlow]
  );

  if (pendingSecondFactor) {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <Text style={styles.title} accessibilityRole="header">Verify Your Identity</Text>
          <Text style={styles.subtitle}>
            We sent a verification code to {email}
          </Text>
          <TextInput
            placeholder="Verification code"
            onChangeText={setCode}
            value={code}
            keyboardType="number-pad"
            style={styles.input}
            accessibilityLabel="Verification code"
          />
          <TouchableOpacity
            style={styles.button}
            onPress={handleVerifySecondFactor}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Verify code"
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Verify</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        <Text style={styles.title} accessibilityRole="header">Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to your account</Text>

        <TouchableOpacity
          style={styles.oauthButton}
          onPress={() => handleOAuth("oauth_google")}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Continue with Google"
        >
          <Text style={styles.oauthButtonText}>Continue with Google</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.oauthButton, styles.appleButton]}
          onPress={() => handleOAuth("oauth_apple")}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Continue with Apple"
        >
          <Text style={[styles.oauthButtonText, styles.appleButtonText]}>
            Continue with Apple
          </Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <TextInput
          placeholder="Email"
          onChangeText={setEmail}
          value={email}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
          accessibilityLabel="Email address"
          accessibilityHint="Enter your email"
        />

        <TextInput
          placeholder="Password"
          secureTextEntry
          onChangeText={setPassword}
          value={password}
          style={styles.input}
          accessibilityLabel="Password"
          accessibilityHint="Enter your password"
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handleLogin}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Sign in"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => router.push("/signup")}
          accessibilityRole="link"
          accessibilityLabel="Don't have an account? Sign up"
        >
          <Text style={styles.linkText}>
            Don't have an account? <Text style={styles.linkBold}>Sign Up</Text>
          </Text>
        </TouchableOpacity>

        <Pressable onPress={() => router.push("/resetPassword")} accessibilityRole="link" accessibilityLabel="Forgot password">
          <Text style={styles.forgotPasswordText}>Forgot password?</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 4,
    color: "#333",
    alignSelf: "flex-start",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 24,
    alignSelf: "flex-start",
  },
  oauthButton: {
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
    marginBottom: 12,
    backgroundColor: "#fff",
    width: "100%",
  },
  oauthButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  appleButton: {
    backgroundColor: "#000",
    borderColor: "#000",
  },
  appleButtonText: {
    color: "#fff",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
    width: "100%",
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#ddd",
  },
  dividerText: {
    paddingHorizontal: 16,
    color: "#999",
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
    fontSize: 16,
    width: "100%",
  },
  button: {
    backgroundColor: "#FF6B35",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12,
    marginTop: 4,
    width: "100%",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  linkButton: {
    alignItems: "center",
    padding: 8,
  },
  linkText: {
    color: "#666",
    fontSize: 14,
  },
  linkBold: {
    color: "#FF6B35",
    fontWeight: "600",
  },
  forgotPasswordText: {
    padding: 10,
    color: "#FF6B35",
    fontWeight: "600",
    textAlign: "center",
  },
});
