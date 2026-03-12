import React, { useRef, useState } from "react";
import { useRouter } from "expo-router"
import { useSignIn } from "@clerk/clerk-expo";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
} from "react-native";

export default function VerificationCodeScreen() {
  const [code, setCode] = useState<string[]>(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState<boolean>(false);
  const { signIn, isLoaded } = useSignIn();

  const inputs = useRef<Array<TextInput | null>>([]);

  const router = useRouter()

  const handleChange = (text: string, index: number) => {
    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);

    if (text && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleBackspace = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number
  ) => {
    if (e.nativeEvent.key === "Backspace" && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const showError = (msg: string) => {
    if (Platform.OS === 'web') {
      window.alert(msg);
    } else {
      Alert.alert('Error', msg);
    }
  };

  const handleVerify = async () => {
    if (!isLoaded) return;
    const codeString = code.join('');
    if (codeString.length !== 6) {
      showError('Please enter the full 6-digit code.');
      return;
    }

    setLoading(true);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code: codeString,
      });

      if (result.status === 'needs_new_password') {
        router.push('/resetPassword/setNewPassword');
      } else {
        showError('Unexpected status. Please try again.');
      }
    } catch (error: any) {
      const msg = error.errors?.[0]?.longMessage || error.errors?.[0]?.message || error.message || 'Invalid verification code.';
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    if (!isLoaded) return;
    try {
      const emailFactor = signIn.supportedFirstFactors?.find(
        (f: any) => f.strategy === 'reset_password_email_code'
      ) as any;
      await signIn.prepareFirstFactor({
        strategy: 'reset_password_email_code',
        emailAddressId: emailFactor?.emailAddressId,
      });
      if (Platform.OS === 'web') {
        window.alert('A new verification code was sent.');
      } else {
        Alert.alert('Code Sent', 'A new verification code was sent.');
      }
    } catch (error: any) {
      const msg = error.errors?.[0]?.longMessage || error.errors?.[0]?.message || error.message || 'Failed to resend code.';
      showError(msg);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter Verification Code</Text>

      <Text style={styles.subtitle}>
        Enter the 6-digit code sent to your email
      </Text>

      <View style={styles.codeContainer}>
        {code.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => (inputs.current[index] = ref)}
            style={styles.input}
            keyboardType="number-pad"
            maxLength={1}
            value={digit}
            onChangeText={(text) => handleChange(text, index)}
            onKeyPress={(e) => handleBackspace(e, index)}
          />
        ))}
      </View>

      <TouchableOpacity style={styles.button} onPress={handleVerify}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Verify Code</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={resendCode}>
        <Text style={styles.resendText}>Resend Code</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#fff",
  },

  title: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 10,
  },

  subtitle: {
    color: "#666",
    marginBottom: 30,
  },

  codeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },

  input: {
    width: 50,
    height: 55,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    textAlign: "center",
    fontSize: 20,
  },

  button: {
    backgroundColor: "#90ee90",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 20,
  },

  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },

  resendText: {
    textAlign: "center",
    color: "#90ee90",
    fontWeight: "600",
  },
});