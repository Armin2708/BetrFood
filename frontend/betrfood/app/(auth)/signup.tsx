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
import { useRouter } from "expo-router";
import { useSignIn, useSignUp, useSSO } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

export default function Signup() {
  if (Platform.OS === "web") {
    return <WebSignup />;
  }
  return <NativeSignup />;
}

function WebSignup() {
  const router = useRouter();
  const { signUp, setActive, isLoaded } = useSignUp();
  const { signIn } = useSignIn();

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

      const popup = window.open(
        verificationUrl.toString(),
        "clerk-oauth",
        "width=500,height=600,left=200,top=100"
      );

      if (!popup) {
        throw new Error("Popup blocked. Please allow popups for this site.");
      }

      const pollInterval = setInterval(async () => {
        try {
          if (popup.closed) {
            clearInterval(pollInterval);
            const updatedSignIn = await signIn.reload();
            if (updatedSignIn.status === "complete") {
              await setActive!({ session: updatedSignIn.createdSessionId });
              router.replace("/");
            } else {
              setLoading(false);
            }
          }
        } catch {
          clearInterval(pollInterval);
          setLoading(false);
        }
      }, 500);
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
        <TextInput
          placeholder="Verification code"
          onChangeText={setCode}
          value={code}
          keyboardType="number-pad"
          style={styles.input}
        />
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
          <Ionicons name="logo-google" size={22} color="#EA4335" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.socialButton}
          onPress={() => handleOAuth("oauth_apple")}
          disabled={loading}
        >
          <Ionicons name="logo-apple" size={22} color="#000" />
        </TouchableOpacity>
      </View>

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      <Text style={styles.label}>Email</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          placeholder="Enter your email"
          placeholderTextColor="#9CA3AF"
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
          placeholderTextColor="#9CA3AF"
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
          placeholderTextColor="#9CA3AF"
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

      <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
        <Text style={styles.backLinkText}>
          Already have an account? <Text style={styles.footerLink}>Log in</Text>
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function NativeSignup() {
  const router = useRouter();
  const { signUp, setActive, isLoaded } = useSignUp();
  const { startSSOFlow } = useSSO();

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
    async (strategy: "oauth_google" | "oauth_apple") => {
      if (!isLoaded) return;
      setLoading(true);
      try {
        const { createdSessionId, setActive: setActiveSession } =
          await startSSOFlow({ strategy });

        if (createdSessionId) {
          await setActiveSession!({ session: createdSessionId });
          router.replace("/");
        }
      } catch (error: any) {
        console.error("OAuth error:", error);
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

        <TextInput
          placeholder="Verification code"
          onChangeText={setCode}
          value={code}
          keyboardType="number-pad"
          style={styles.input}
        />

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
            <Ionicons name="logo-google" size={22} color="#EA4335" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.socialButton}
            onPress={() => handleOAuth("oauth_apple")}
            disabled={loading}
          >
            <Ionicons name="logo-apple" size={22} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Email */}
        <Text style={styles.label}>Email</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            placeholder="Enter your email"
            placeholderTextColor="#9CA3AF"
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
            placeholderTextColor="#9CA3AF"
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
            placeholderTextColor="#9CA3AF"
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
          <Text style={styles.backLinkText}>
            Already have an account? <Text style={styles.footerLink}>Log in</Text>
          </Text>
        </TouchableOpacity>

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
    fontSize: 26,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 14,
    color: "#9CA3AF",
    marginBottom: 24,
    lineHeight: 20,
  },
  socialRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  socialButton: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
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
    backgroundColor: "#F3F4F6",
  },
  dividerText: {
    fontSize: 13,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  input: {
    height: 52,
    fontSize: 15,
    color: "#1F2937",
    flex: 1,
  },
  signUpButton: {
    backgroundColor: "#4AC55E",
    borderRadius: 16,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    shadowColor: "#4AC55E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
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
    color: "#9CA3AF",
  },
  footerLink: {
    fontSize: 12,
    color: "#4AC55E",
    fontWeight: "600",
  },
  backLink: {
    alignItems: "center",
    marginTop: 12,
  },
  backLinkText: {
    fontSize: 13,
    color: "#9CA3AF",
  },
});
