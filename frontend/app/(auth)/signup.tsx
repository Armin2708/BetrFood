import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
} from "react-native";
import { useState, useCallback } from "react";
import { useRouter, Redirect } from "expo-router";
import { useAuth, useSignIn, useSignUp, useSSO } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
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

export default function Signup() {
  const { isSignedIn, isLoaded } = useAuth();

  // Already signed in — redirect to home
  if (isLoaded && isSignedIn) {
    return <Redirect href="/" />;
  }

  if (Platform.OS === "web") {
    return <WebSignup />;
  }
  return <NativeSignup />;
}

function WebSignup() {
  const router = useRouter();
  const { signUp, setActive, isLoaded } = useSignUp();
  const { signIn, setActive: setSignInActive } = useSignIn();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!isLoaded || !signUp) return;
    if (!email || !password) {
      window.alert("Please enter email and password.");
      return;
    }
    if (password.length < 8) {
      window.alert("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      window.alert("Passwords don't match.");
      return;
    }

    setLoading(true);
    try {
      await signUp.create({ emailAddress: email, password });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (error: any) {
      const msg =
        error.errors?.[0]?.longMessage ||
        error.errors?.[0]?.message ||
        error.message ||
        "Signup failed";
      window.alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!isLoaded || !signUp) return;
    setLoading(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
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

  const handleOAuth = async (strategy: "oauth_google" | "oauth_apple" | "oauth_facebook" | "oauth_x") => {
    if (!isLoaded || !signUp) return;
    setLoading(true);
    try {
      // Try signUp first; if the account already exists, Clerk will throw
      // an error — we catch it and fall back to signIn.
      let verificationUrl: string | null = null;

      try {
        const result = await signUp.create({
          strategy,
          redirectUrl: window.location.origin + "/sso-callback",
          actionCompleteRedirectUrl: window.location.origin + "/",
        });
        verificationUrl =
          result.verifications?.externalAccount?.externalVerificationRedirectURL?.toString() ?? null;
      } catch (signUpError: any) {
        // Account already exists — fall back to signIn
        if (signIn) {
          const result = await signIn.create({
            strategy,
            redirectUrl: window.location.origin + "/sso-callback",
            actionCompleteRedirectUrl: window.location.origin + "/",
          });
          verificationUrl =
            result.firstFactorVerification?.externalVerificationRedirectURL?.toString() ?? null;
        } else {
          throw signUpError;
        }
      }

      if (!verificationUrl) {
        throw new Error("No OAuth redirect URL returned from Clerk");
      }

      window.location.href = verificationUrl;
    } catch (error: any) {
      console.error("OAuth error:", error);
      const msg =
        error.errors?.[0]?.longMessage ||
        error.errors?.[0]?.message ||
        error.message ||
        "OAuth sign-up failed";
      window.alert(msg);
      setLoading(false);
    }
  };

  if (pendingVerification) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Verify Email</Text>
        <Text style={styles.subtitle}>
          We sent a verification code to {email}
        </Text>
        <View style={styles.inputWrapper}>
          <TextInput
            placeholder="Verification code"
            placeholderTextColor="#94A3B8"
            onChangeText={setCode}
            value={code}
            keyboardType="number-pad"
            style={styles.input}
          />
        </View>
        <TouchableOpacity
          style={styles.signUpButton}
          onPress={handleVerify}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.signUpButtonText}>Verify</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.logoContainer}>
        <Image
          source={require("../../assets/images/Logo.png")}
          style={{ width: 80, height: 80 }}
          resizeMode="contain"
        />
      </View>

      <Text style={styles.title}>Create an Account</Text>
      <Text style={styles.subtitle}>
        Sign up with your social media account or email address
      </Text>

      <View style={styles.socialRow}>
        <TouchableOpacity
          style={styles.socialButton}
          onPress={() => handleOAuth("oauth_google")}
          disabled={loading}
        >
          <GoogleIcon size={28} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.socialButton}
          onPress={() => handleOAuth("oauth_apple")}
          disabled={loading}
        >
          <Ionicons name="logo-apple" size={28} color="#000" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.socialButton}
          onPress={() => handleOAuth("oauth_facebook")}
          disabled={loading}
        >
          <Ionicons name="logo-facebook" size={28} color="#1877F2" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.socialButton}
          onPress={() => handleOAuth("oauth_x")}
          disabled={loading}
        >
          <Ionicons name="logo-twitter" size={28} color="#000" />
        </TouchableOpacity>
      </View>

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      <Text style={styles.label}>Username</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          placeholder="Choose a username"
          placeholderTextColor="#94A3B8"
          onChangeText={setUsername}
          value={username}
          style={styles.input}
          autoCapitalize="none"
        />
      </View>

      <Text style={styles.label}>Email</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          placeholder="Enter your email"
          placeholderTextColor="#94A3B8"
          onChangeText={setEmail}
          value={email}
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <Text style={styles.label}>Password</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          placeholder="Create a password"
          placeholderTextColor="#94A3B8"
          onChangeText={setPassword}
          value={password}
          style={styles.input}
          secureTextEntry
          autoCapitalize="none"
        />
      </View>

      <Text style={styles.label}>Confirm Password</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          placeholder="Confirm your password"
          placeholderTextColor="#94A3B8"
          onChangeText={setConfirmPassword}
          value={confirmPassword}
          style={styles.input}
          secureTextEntry
          autoCapitalize="none"
        />
      </View>

      <TouchableOpacity
        style={[styles.signUpButton, loading && { opacity: 0.75 }]}
        onPress={handleSignup}
        disabled={loading}
        activeOpacity={0.85}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.signUpButtonText}>Sign Up</Text>
        )}
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>By signing up, you agree to our </Text>
        <TouchableOpacity>
          <Text style={styles.footerLink}>Terms & Conditions</Text>
        </TouchableOpacity>
        <Text style={styles.footerText}> and </Text>
        <TouchableOpacity>
          <Text style={styles.footerLink}>Privacy Policy</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.backLink}>
        <Text style={styles.backLinkText}>Already have an account? </Text>
        <TouchableOpacity onPress={() => router.replace("/(auth)/login")}>
          <Text style={styles.footerLink}>Log in</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function NativeSignup() {
  const router = useRouter();
  const { signUp, setActive, isLoaded } = useSignUp();
  const { startSSOFlow } = useSSO();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!isLoaded || !signUp) return;
    if (!email || !password) {
      Alert.alert("Error", "Please enter email and password.");
      return;
    }
    if (password.length < 8) {
      Alert.alert("Error", "Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords don't match.");
      return;
    }

    setLoading(true);
    try {
      await signUp.create({
        emailAddress: email,
        password,
      });

      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (error: any) {
      const msg =
        error.errors?.[0]?.longMessage ||
        error.errors?.[0]?.message ||
        error.message ||
        "Signup failed";
      Alert.alert("Signup Failed", msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!isLoaded || !signUp) return;
    setLoading(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });

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
    async (strategy: "oauth_google" | "oauth_apple" | "oauth_facebook" | "oauth_x") => {
      if (!isLoaded) return;
      setLoading(true);
      try {
        const { createdSessionId, setActive: setActiveSession, signUp: ssoSignUp, signIn: ssoSignIn } =
          await startSSOFlow({
            strategy,
            redirectUrl: AuthSession.makeRedirectUri({ scheme: "betrfood" }),
          });

        if (createdSessionId) {
          await setActiveSession!({ session: createdSessionId });
          router.replace("/");
        } else if (ssoSignUp) {
          const latest = ssoSignUp.status === "complete" ? ssoSignUp : await ssoSignUp.reload();
          if (latest.status === "complete" && latest.createdSessionId) {
            await setActiveSession!({ session: latest.createdSessionId });
            router.replace("/");
          } else {
            console.log("[OAuth] signUp still incomplete:", latest.status, latest.missingFields);
            Alert.alert("Sign Up Incomplete", "Could not complete account creation. Please try signing up with email.");
          }
        } else {
          Alert.alert("Sign Up Incomplete", "Additional verification steps may be required.");
        }
      } catch (error: any) {
        console.error("OAuth error:", JSON.stringify(error, null, 2));
        const msg =
          error.errors?.[0]?.longMessage ||
          error.errors?.[0]?.message ||
          error.message ||
          "OAuth sign-up failed";
        Alert.alert("Sign Up Failed", msg);
      } finally {
        setLoading(false);
      }
    },
    [isLoaded, startSSOFlow]
  );

  if (pendingVerification) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Verify Email</Text>
        <Text style={styles.subtitle}>
          We sent a verification code to {email}
        </Text>

        <View style={styles.inputWrapper}>
          <TextInput
            placeholder="Verification code"
            placeholderTextColor="#94A3B8"
            onChangeText={setCode}
            value={code}
            keyboardType="number-pad"
            style={styles.input}
          />
        </View>

        <TouchableOpacity
          style={styles.signUpButton}
          onPress={handleVerify}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.signUpButtonText}>Verify</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#fff" }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require("../../assets/images/Logo.png")}
            style={{ width: 80, height: 80 }}
            resizeMode="contain"
          />
        </View>

        {/* Header */}
        <Text style={styles.title}>Create an Account</Text>
        <Text style={styles.subtitle}>
          Sign up with your social media account or email address
        </Text>

        {/* Social Buttons */}
        <View style={styles.socialRow}>
          <TouchableOpacity
            style={styles.socialButton}
            onPress={() => handleOAuth("oauth_google")}
            disabled={loading}
          >
            <GoogleIcon size={28} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.socialButton}
            onPress={() => handleOAuth("oauth_apple")}
            disabled={loading}
          >
            <Ionicons name="logo-apple" size={28} color="#000" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.socialButton}
            onPress={() => handleOAuth("oauth_facebook")}
            disabled={loading}
          >
            <Ionicons name="logo-facebook" size={28} color="#1877F2" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.socialButton}
            onPress={() => handleOAuth("oauth_x")}
            disabled={loading}
          >
            <Ionicons name="logo-twitter" size={28} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Username */}
        <Text style={styles.label}>Username</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            placeholder="Choose a username"
            placeholderTextColor="#94A3B8"
            onChangeText={setUsername}
            value={username}
            style={styles.input}
            autoCapitalize="none"
          />
        </View>

        {/* Email */}
        <Text style={styles.label}>Email</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            placeholder="Enter your email"
            placeholderTextColor="#94A3B8"
            onChangeText={setEmail}
            value={email}
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* Password */}
        <Text style={styles.label}>Password</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            placeholder="Create a password"
            placeholderTextColor="#94A3B8"
            onChangeText={setPassword}
            value={password}
            style={styles.input}
            secureTextEntry
            autoCapitalize="none"
          />
        </View>

        {/* Confirm Password */}
        <Text style={styles.label}>Confirm Password</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            placeholder="Confirm your password"
            placeholderTextColor="#94A3B8"
            onChangeText={setConfirmPassword}
            value={confirmPassword}
            style={styles.input}
            secureTextEntry
            autoCapitalize="none"
          />
        </View>

        {/* Sign Up Button */}
        <TouchableOpacity
          style={[styles.signUpButton, loading && { opacity: 0.75 }]}
          onPress={handleSignup}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.signUpButtonText}>Sign Up</Text>
          )}
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>By signing up, you agree to our </Text>
          <TouchableOpacity>
            <Text style={styles.footerLink}>Terms & Conditions</Text>
          </TouchableOpacity>
          <Text style={styles.footerText}> and </Text>
          <TouchableOpacity>
            <Text style={styles.footerLink}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>

        {/* Back to Login */}
        <View style={styles.backLink}>
          <Text style={styles.backLinkText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.replace("/(auth)/login")}>
            <Text style={styles.footerLink}>Log in</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
    backgroundColor: "#fff",
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 24,
    lineHeight: 18,
  },
  socialRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  socialButton: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  dividerText: {
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "500",
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  input: {
    height: 52,
    fontSize: 14,
    color: "#0F172A",
    flex: 1,
  },
  signUpButton: {
    backgroundColor: "#22C55E",
    borderRadius: 14,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    shadowColor: "rgba(34, 197, 94, 0.35)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 5,
  },
  signUpButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  footer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 20,
  },
  footerText: {
    fontSize: 12,
    color: "#94A3B8",
  },
  footerLink: {
    fontSize: 12,
    color: "#22C55E",
    fontWeight: "600",
  },
  backLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  backLinkText: {
    fontSize: 13,
    color: "#94A3B8",
  },
});
