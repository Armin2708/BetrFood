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
import { useState, useContext } from "react";
import { AuthContext } from "../../context/AuthenticationContext";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

export default function Signup() {
  const router = useRouter();
  const { signup } = useContext(AuthContext);
  const [username, setUsername] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [googleLoading, setGoogleLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const [_request, _response, promptAsync] = Google.useAuthRequest({
    iosClientId: "YOUR_IOS_CLIENT_ID",
    androidClientId: "YOUR_ANDROID_CLIENT_ID",
    webClientId: "YOUR_WEB_CLIENT_ID",
  });

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const result = await promptAsync();
      if (result.type === "success") {
        const { authentication } = result;
        router.replace("/(onboarding)");
      } else if (result.type !== "cancel") {
        setErrors({ general: "Google Sign-In failed. Please try again." });
      }
    } catch (e) {
      setErrors({ general: "Google Sign-In failed. Please try again." });
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAppleSignIn = () => {
    Alert.alert("Coming Soon", "Apple Sign-In will be available once authentication is set up.", [{ text: "OK" }]);
  };

  const handleFacebookSignIn = () => {
    Alert.alert("Coming Soon", "Facebook Sign-In will be available once authentication is set up.", [{ text: "OK" }]);
  };

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    if (!username.trim()) newErrors.username = "Username is required";
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) newErrors.email = "Enter a valid email";
    if (password.length < 8) newErrors.password = "Minimum 8 characters";
    if (password !== confirmPassword) newErrors.confirmPassword = "Passwords don't match";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await signup(email, password);
      router.replace("/(onboarding)");
    } catch (e) {
      setErrors({ general: "Sign up failed. Please try again." });
    } finally {
      setLoading(false);
    }
  };

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

          {/* Google — fully wired */}
          <TouchableOpacity
            style={styles.socialButton}
            onPress={handleGoogleSignIn}
            disabled={googleLoading}
          >
            {googleLoading ? (
              <ActivityIndicator size="small" color="#EA4335" />
            ) : (
              <Image
                source={{ uri: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Google_%22G%22_logo.svg/768px-Google_%22G%22_logo.svg.png" }}
                style={{ width: 22, height: 22 }}
                resizeMode="contain"
              />
            )}
          </TouchableOpacity>

          {/* Apple — UI ready, Supabase wiring TODO */}
          <TouchableOpacity style={styles.socialButton} onPress={handleAppleSignIn}>
            <Ionicons name="logo-apple" size={22} color="#000" />
          </TouchableOpacity>

          {/* Facebook — UI ready, Supabase wiring TODO */}
          <TouchableOpacity style={styles.socialButton} onPress={handleFacebookSignIn}>
            <Ionicons name="logo-facebook" size={22} color="#1877F2" />
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
        <View style={[styles.inputWrapper, errors.username ? styles.inputError : null]}>
          <TextInput
            placeholder="Choose a username"
            placeholderTextColor="#9CA3AF"
            onChangeText={setUsername}
            value={username}
            style={styles.input}
            autoCapitalize="none"
          />
        </View>
        {errors.username ? <Text style={styles.errorText}>{errors.username}</Text> : null}

        {/* Email */}
        <Text style={styles.label}>Email</Text>
        <View style={[styles.inputWrapper, errors.email ? styles.inputError : null]}>
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
        {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}

        {/* Password */}
        <Text style={styles.label}>Password</Text>
        <View style={[styles.inputWrapper, errors.password ? styles.inputError : null]}>
          <TextInput
            placeholder="Create a password"
            placeholderTextColor="#9CA3AF"
            onChangeText={setPassword}
            value={password}
            style={[styles.input, { flex: 1 }]}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
          />
          <TouchableOpacity onPress={() => setShowPassword((p) => !p)} style={styles.eyeBtn}>
            <Ionicons
              name={showPassword ? "eye-outline" : "eye-off-outline"}
              size={20}
              color="#9CA3AF"
            />
          </TouchableOpacity>
        </View>
        {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}

        {/* Confirm Password */}
        <Text style={styles.label}>Confirm Password</Text>
        <View style={[styles.inputWrapper, errors.confirmPassword ? styles.inputError : null]}>
          <TextInput
            placeholder="Confirm your password"
            placeholderTextColor="#9CA3AF"
            onChangeText={setConfirmPassword}
            value={confirmPassword}
            style={[styles.input, { flex: 1 }]}
            secureTextEntry={!showConfirmPassword}
            autoCapitalize="none"
          />
          <TouchableOpacity onPress={() => setShowConfirmPassword((p) => !p)} style={styles.eyeBtn}>
            <Ionicons
              name={showConfirmPassword ? "eye-outline" : "eye-off-outline"}
              size={20}
              color="#9CA3AF"
            />
          </TouchableOpacity>
        </View>
        {errors.confirmPassword ? <Text style={styles.errorText}>{errors.confirmPassword}</Text> : null}

        {/* General error */}
        {errors.general ? (
          <Text style={[styles.errorText, { textAlign: "center", marginTop: 4 }]}>
            {errors.general}
          </Text>
        ) : null}

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
    marginBottom: 4,
  },
  inputError: {
    borderColor: "#F87171",
    backgroundColor: "#FEF2F2",
  },
  input: {
    height: 52,
    fontSize: 15,
    color: "#1F2937",
    flex: 1,
  },
  eyeBtn: {
    paddingLeft: 8,
    paddingVertical: 4,
  },
  errorText: {
    fontSize: 12,
    color: "#EF4444",
    marginBottom: 10,
    paddingLeft: 4,
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