import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { LogIn, Key, Phone } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { authService } from '../services/authService';
import { authStore } from '../store/authStore';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

interface CustomerLoginScreenProps {
  onSuccess: () => void;
}

export const CustomerLoginScreen: React.FC<CustomerLoginScreenProps> = ({ onSuccess }) => {
  const [phone, setPhone] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [idError, setIdError] = useState('');

  const handleLogin = async () => {
    let hasError = false;
    setPhoneError('');
    setIdError('');

    if (!phone.trim()) {
      setPhoneError('رقم الهاتف مطلوب');
      hasError = true;
    }
    if (!idNumber.trim()) {
      setIdError('رقم الهوية الوطنية مطلوب');
      hasError = true;
    }

    if (hasError) return;

    setLoading(true);
    const res = await authService.login(phone, idNumber);
    setLoading(false);

    if (res.success && res.data) {
      await authStore.setSession(res.data.token, res.data.customer);
      onSuccess();
    } else {
      Alert.alert('فشل الدخول', res.message || 'بيانات الدخول غير صحيحة. يرجى إدخال رقم الهاتف ورقم الهوية الوطنية الصحيحين المسجلين في عقد الشراء.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Top Branding Section */}
        <View style={styles.brandContainer}>
          <View style={styles.logoCircle}>
            <LogIn size={40} color={colors.accent} style={styles.logoIcon} />
          </View>
          <Text style={styles.brandName}>الأصدقاء للسيارات</Text>
          <Text style={styles.brandTitle}>بوابة الزبائن الالكترونية</Text>
          <Text style={styles.brandSub}>سجل دخولك لمتابعة أقساطك والمدفوعات الخاصة بك</Text>
        </View>

        {/* Form Card */}
        <View style={styles.formCard}>
          <Input
            label="رقم الهاتف المسجل بالعقد *"
            value={phone}
            onChangeText={setPhone}
            placeholder="07XXXXXXXX"
            keyboardType="phone-pad"
            error={phoneError}
          />
          
          <Input
            label="رقم الهوية الوطنية (كلمة المرور) *"
            value={idNumber}
            onChangeText={setIdNumber}
            placeholder="أدخل رقم الهوية أو جواز السفر المسجل..."
            secureTextEntry={true}
            error={idError}
          />

          <View style={styles.tipBox}>
            <Text style={styles.tipText}>
              💡 ملاحظة: كلمة المرور الافتراضية الخاصة بك هي رقم الهوية (البطاقة الموحدة أو جواز السفر) الذي قدمته عند شراء السيارة.
            </Text>
          </View>

          <Button
            title="تسجيل الدخول الآمن"
            onPress={handleLogin}
            loading={loading}
            style={styles.loginBtn}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 24,
    justifyContent: 'center',
    minHeight: '100%',
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoIcon: {
    transform: [{ scaleX: -1 }], // Flip for RTL direction
  },
  brandName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'center',
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.accent,
    marginTop: 4,
    textAlign: 'center',
  },
  brandSub: {
    fontSize: 12,
    color: colors.secondary,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  formCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  tipBox: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    marginVertical: 14,
  },
  tipText: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 16,
    textAlign: 'right',
  },
  loginBtn: {
    marginTop: 8,
    width: '100%',
  },
});
