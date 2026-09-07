/**
 * Login Screen — GreenPath Mobile
 *
 * Replicates the mobile view of the existing web login page:
 * - Centered logo on top
 * - Tagline
 * - User ID input with placeholder
 * - Password input with show/hide toggle
 * - Terms checkbox with ToS/Privacy links
 * - Emerald login button with loading state
 * - Error display
 * - Legal footer links
 */
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/auth/AuthProvider';
import { Colors, Typography, Spacing, BorderRadius } from '../../src/constants/theme';
import { getFriendlyErrorMessage } from '../../src/utils/errorMessage';

export default function LoginScreen() {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const { login, isLoading, error, clearError } = useAuth();

  const handleLogin = async () => {
    if (!userId.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both User ID and Password.');
      return;
    }
    if (!agreedToTerms) {
      Alert.alert('Error', 'Please agree to the Terms of Service and Privacy Policy before logging in.');
      return;
    }

    clearError();
    try {
      await login(userId.trim(), password);
    } catch {
      // Error is already set in auth state
    }
  };

  const openLink = (path: string) => {
    // Opens in system browser — links to the web app's legal pages
    Linking.openURL(`https://greenpathindia.in${path}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/logo-full.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.tagline}>
              Digital waste governance for communities
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Error message */}
            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{getFriendlyErrorMessage(error)}</Text>
              </View>
            ) : null}

            {/* User ID */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>User ID</Text>
              <TextInput
                style={styles.input}
                placeholder="V001-M1, V001-C1, V001-G1..."
                placeholderTextColor={Colors.slate400}
                value={userId}
                onChangeText={setUserId}
                autoCapitalize="characters"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>

            {/* Password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="Password"
                  placeholderTextColor={Colors.slate400}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={22}
                    color={Colors.slate500}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Terms Checkbox */}
            <TouchableOpacity
              style={styles.termsRow}
              onPress={() => setAgreedToTerms(!agreedToTerms)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
                {agreedToTerms && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.termsText}>
                I agree to the{' '}
                <Text style={styles.link} onPress={() => openLink('/terms-of-service')}>
                  Terms of Service
                </Text>
                {' '}and{' '}
                <Text style={styles.link} onPress={() => openLink('/privacy-policy')}>
                  Privacy Policy
                </Text>
              </Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity
              style={[
                styles.loginButton,
                (!agreedToTerms || isLoading) && styles.loginButtonDisabled,
              ]}
              onPress={handleLogin}
              disabled={!agreedToTerms || isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <View style={styles.buttonContent}>
                  <ActivityIndicator size="small" color={Colors.white} />
                  <Text style={styles.loginButtonText}>  Logging in...</Text>
                </View>
              ) : (
                <Text style={styles.loginButtonText}>Login</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Legal Footer */}
          <View style={styles.footer}>
            <View style={styles.footerLinks}>
              <TouchableOpacity onPress={() => openLink('/privacy-policy')}>
                <Text style={styles.footerLink}>Privacy Policy</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => openLink('/terms-of-service')}>
                <Text style={styles.footerLink}>Terms of Service</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => openLink('/data-protection')}>
                <Text style={styles.footerLink}>Data Protection</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.copyright}>
              © {new Date().getFullYear()} GreenPath. All rights reserved.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xxl,
    justifyContent: 'center',
  },

  // Logo
  logoContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
  },
  logo: {
    width: 200,
    height: 50,
    marginBottom: Spacing.md,
  },
  tagline: {
    fontSize: 14,
    color: Colors.slate500,
    fontFamily: Typography.fontFamily,
    textAlign: 'center',
  },

  // Form
  form: {
    gap: Spacing.xl,
  },
  fieldGroup: {
    gap: Spacing.sm,
  },
  label: {
    fontSize: 14,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate700,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: Colors.slate200,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
    fontFamily: Typography.fontFamily,
    color: Colors.slate900,
    backgroundColor: Colors.white,
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    width: 36,
  },
  eyeText: {
    fontSize: 18,
  },

  // Terms
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
    borderColor: Colors.slate300,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: Colors.emerald600,
    borderColor: Colors.emerald600,
  },
  checkmark: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: Colors.slate500,
    fontFamily: Typography.fontFamily,
    lineHeight: 20,
  },
  link: {
    color: Colors.emerald600,
    textDecorationLine: 'underline',
  },

  // Login Button
  loginButton: {
    height: 48,
    backgroundColor: Colors.emerald600,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.emerald600,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    fontSize: 16,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.white,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Error
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  errorText: {
    fontSize: 14,
    color: Colors.destructive,
    fontFamily: Typography.fontFamily,
  },

  // Footer
  footer: {
    marginTop: Spacing.xxxl,
    paddingTop: Spacing.xxl,
    borderTopWidth: 1,
    borderTopColor: Colors.slate100,
    alignItems: 'center',
    gap: Spacing.lg,
  },
  footerLinks: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  footerLink: {
    fontSize: 12,
    color: Colors.slate400,
    fontFamily: Typography.fontFamily,
  },
  copyright: {
    fontSize: 12,
    color: Colors.slate300,
    fontFamily: Typography.fontFamily,
  },
});
