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
  Image,
} from "react-native";
import { useState, useCallback } from "react";
import { useRouter } from "expo-router";
import { useAuth, useSignIn, useSSO } from "@clerk/clerk-expo";
import { Redirect } from "expo-router";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";

function GoogleIcon({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18">
      <Path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
        fill="#4285F4"
      />
      <Path
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
        fill="#34A853"
      />
      <Path
        d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"
        fill="#FBBC05"
      />
      <Path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </Svg>
  );
}

WebBrowser.maybeCompleteAuthSession();

export default function Login() {
  const { isSignedIn, isLoaded } = useAuth();

  // Already signed in — redirect to home
  if (isLoaded && isSignedIn) {
    return <Redirect href="/" />;
  }

  if (Platform.OS === "web") {
    return <WebLogin />;
  }
  return <NativeLogin />;
}

/* ------------------------------------------------------------------ */
/*  Shared UI for the login form (used by both Web and Native)        */
/* ------------------------------------------------------------------ */

function LoginFormUI({
  email,
  setEmail,
  password,
  setPassword,
  loading,
  onLogin,
  onOAuthGoogle,
  onOAuthApple,
  onForgotPassword,
  onSignup,
}: {
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  loading: boolean;
  onLogin: () => void;
  onOAuthGoogle: () => void;
  onOAuthApple: () => void;
  onForgotPassword: () => void;
  onSignup: () => void;
}) {
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        {/* Logo */}
        <Image
          source={require("../../assets/images/Logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        {/* Title */}
        <Text style={styles.title} accessibilityRole="header">
          Welcome to <Text style={styles.titleGreen}>BetrFood</Text>
        </Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          Discover healthier eating habits with fellow food lovers
        </Text>

        {/* Email input */}
        <TextInput
          placeholder="Email or username"
          placeholderTextColor="#94A3B8"
          onChangeText={setEmail}
          value={email}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
          accessibilityLabel="Email address"
          accessibilityHint="Enter your email"
        />

        {/* Password input */}
        <TextInput
          placeholder="Password"
          placeholderTextColor="#94A3B8"
          secureTextEntry
          onChangeText={setPassword}
          value={password}
          style={styles.input}
          accessibilityLabel="Password"
          accessibilityHint="Enter your password"
        />

        {/* Log In button */}
        <TouchableOpacity
          style={styles.button}
          onPress={onLogin}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Log in"
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={["#22C55E", "#10B981"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.buttonGradient}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Log In</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Forgot password */}
        <Pressable
          onPress={onForgotPassword}
          accessibilityRole="link"
          accessibilityLabel="Forgot password"
          style={styles.forgotPasswordWrapper}
        >
          <Text style={styles.forgotPasswordText}>Forgot password?</Text>
        </Pressable>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>Sign in with</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Social buttons row */}
        <View style={styles.socialRow}>
          <TouchableOpacity
            style={styles.socialButton}
            onPress={onOAuthGoogle}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Continue with Google"
          >
            <GoogleIcon size={28} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.socialButton}
            onPress={onOAuthApple}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Continue with Apple"
          >
            <Ionicons name="logo-apple" size={28} color="#000000" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.socialButton}
            onPress={() => {
              const msg = "Facebook sign-in is not yet available.";
              Platform.OS === "web" ? window.alert(msg) : Alert.alert("Coming Soon", msg);
            }}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Continue with Facebook"
          >
            <Ionicons name="logo-facebook" size={28} color="#1877F2" />
          </TouchableOpacity>
        </View>

        {/* Sign up link */}
        <View style={styles.signupRow}>
          <Text style={styles.signupText}>Don't have an account? </Text>
          <TouchableOpacity
            onPress={onSignup}
            accessibilityRole="link"
            accessibilityLabel="Sign up"
          >
            <Text style={styles.signupLink}>Sign up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function VerifyFormUI({
  email,
  code,
  setCode,
  loading,
  onVerify,
}: {
  email: string;
  code: string;
  setCode: (v: string) => void;
  loading: boolean;
  onVerify: () => void;
}) {
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        <Image
          source={require("../../assets/images/Logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title} accessibilityRole="header">
          Verify Your Identity
        </Text>
        <Text style={styles.subtitle}>
          We sent a verification code to {email}
        </Text>
        <TextInput
          placeholder="Verification code"
          placeholderTextColor="#94A3B8"
          onChangeText={setCode}
          value={code}
          keyboardType="number-pad"
          style={styles.input}
          accessibilityLabel="Verification code"
        />
        <TouchableOpacity
          style={styles.button}
          onPress={onVerify}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Verify code"
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={["#22C55E", "#10B981"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.buttonGradient}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Verify</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ------------------------------------------------------------------ */
/*  WebLogin                                                           */
/* ------------------------------------------------------------------ */

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
      const result = await signIn.attemptSecondFactor({
        strategy: "email_code",
        code,
      });
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

      // Redirect in the same window instead of opening a popup
      window.location.href = verificationUrl.toString();
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
      <VerifyFormUI
        email={email}
        code={code}
        setCode={setCode}
        loading={loading}
        onVerify={handleVerifySecondFactor}
      />
    );
  }

  return (
    <LoginFormUI
      email={email}
      setEmail={setEmail}
      password={password}
      setPassword={setPassword}
      loading={loading}
      onLogin={handleLogin}
      onOAuthGoogle={() => handleOAuth("oauth_google")}
      onOAuthApple={() => handleOAuth("oauth_apple")}
      onForgotPassword={() => router.push("/(auth)/resetPassword")}
      onSignup={() => router.push("/(auth)/signup")}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  NativeLogin                                                        */
/* ------------------------------------------------------------------ */

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
      const result = await signIn.attemptSecondFactor({
        strategy: "email_code",
        code,
      });
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
        const {
          createdSessionId,
          setActive: setActiveSession,
          signUp,
          signIn: ssoSignIn,
        } = await startSSOFlow({
          strategy,
          redirectUrl: AuthSession.makeRedirectUri({ scheme: "betrfood" }),
        });

        if (createdSessionId) {
          await setActiveSession!({ session: createdSessionId });
          router.replace("/");
        } else if (signUp) {
          // New user — Clerk transferred signIn -> signUp.
          // Username will be set during onboarding.
          const latest =
            signUp.status === "complete" ? signUp : await signUp.reload();
          if (latest.status === "complete" && latest.createdSessionId) {
            await setActiveSession!({ session: latest.createdSessionId });
            router.replace("/");
          } else {
            console.log(
              "[OAuth] signUp still incomplete:",
              latest.status,
              latest.missingFields
            );
            Alert.alert(
              "Sign In Incomplete",
              "Could not complete account creation. Please try signing up with email."
            );
          }
        } else {
          Alert.alert(
            "Sign In Incomplete",
            "Additional verification steps may be required."
          );
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
      <VerifyFormUI
        email={email}
        code={code}
        setCode={setCode}
        loading={loading}
        onVerify={handleVerifySecondFactor}
      />
    );
  }

  return (
    <LoginFormUI
      email={email}
      setEmail={setEmail}
      password={password}
      setPassword={setPassword}
      loading={loading}
      onLogin={handleLogin}
      onOAuthGoogle={() => handleOAuth("oauth_google")}
      onOAuthApple={() => handleOAuth("oauth_apple")}
      onForgotPassword={() => router.push("/(auth)/resetPassword")}
      onSignup={() => router.push("/(auth)/signup")}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 28,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 8,
  },
  titleGreen: {
    color: "#22C55E",
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  input: {
    width: "100%",
    height: 52,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 20,
    fontSize: 15,
    color: "#0F172A",
    backgroundColor: "#FFFFFF",
    marginBottom: 14,
  },
  button: {
    width: "100%",
    marginTop: 4,
    marginBottom: 4,
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#22C55E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonGradient: {
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
  },
  forgotPasswordWrapper: {
    alignSelf: "flex-end",
    marginTop: 8,
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: "#22C55E",
    fontSize: 12,
    fontWeight: "600",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  dividerText: {
    paddingHorizontal: 16,
    color: "#94A3B8",
    fontSize: 13,
  },
  socialRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginBottom: 32,
    width: "100%",
  },
  socialButton: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  signupRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  signupText: {
    fontSize: 14,
    color: "#64748B",
  },
  signupLink: {
    fontSize: 14,
    color: "#22C55E",
    fontWeight: "600",
  },
});
