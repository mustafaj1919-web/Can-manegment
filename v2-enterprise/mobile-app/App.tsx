import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, ActivityIndicator, Alert, Linking, ScrollView, StatusBar, Image } from 'react-native';
import { Compass, Heart, User, PhoneCall, LogOut, ChevronLeft, MapPin, Calendar, Clock, Award, ShieldAlert } from 'lucide-react-native';
import { colors } from './src/theme/colors';
import { authStore } from './src/store/authStore';
import { favoriteStore } from './src/store/favoriteStore';
import { PublicShowroomScreen } from './src/screens/PublicShowroomScreen';
import { VehicleDetailsScreen } from './src/screens/VehicleDetailsScreen';
import { CustomerLoginScreen } from './src/screens/CustomerLoginScreen';
import { CustomerDashboardScreen } from './src/screens/CustomerDashboardScreen';
import { InstallmentsScreen } from './src/screens/InstallmentsScreen';
import { PaymentsScreen } from './src/screens/PaymentsScreen';
import { Button } from './src/components/ui/Button';
import { vehicleService } from './src/services/vehicleService';
import { Vehicle } from './src/types/vehicle';
import { Badge } from './src/components/ui/Badge';
import { formatCurrency } from './src/utils/formatCurrency';

export default function App() {
  const [initialized, setInitialized] = useState(false);
  const [currentTab, setCurrentTab] = useState<'showroom' | 'favorites' | 'portal' | 'contact'>('showroom');
  
  // Navigation stack state inside Tab Showroom / Portal
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [activePortalScreen, setActivePortalScreen] = useState<'dashboard' | 'installments' | 'payments'>('dashboard');

  // Welcome / Onboarding Screen state
  const [showWelcome, setShowWelcome] = useState(true);

  // Store lists/states
  const [authProfile, setAuthProfile] = useState(authStore.getProfile());
  const [favoritesList, setFavoritesList] = useState(favoriteStore.getFavorites());

  // Showroom data for favorites screen
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);

  useEffect(() => {
    // Initial loading
    async function init() {
      await authStore.load();
      await favoriteStore.load();
      
      // Listeners
      authStore.subscribe(() => {
        setAuthProfile(authStore.getProfile());
      });
      favoriteStore.subscribe(() => {
        setFavoritesList(favoriteStore.getFavorites());
      });

      // Load catalog to display favorites offline
      const res = await vehicleService.getVehicles({ perPage: 100 });
      if (res.success && res.data) {
        setAllVehicles(res.data.items);
      }

      setInitialized(false);
      // Let splash show for 2 seconds
      setTimeout(() => {
        setInitialized(true);
      }, 2000);
    }
    init();
  }, []);

  const handleLogout = async () => {
    Alert.alert(
      'تسجيل الخروج',
      'هل أنت متأكد من رغبتك في تسجيل الخروج؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'خروج',
          style: 'destructive',
          onPress: async () => {
            await authStore.clearSession();
            setActivePortalScreen('dashboard');
          }
        }
      ]
    );
  };

  const handleCall = () => {
    Linking.openURL('tel:07700000000');
  };

  const handleMap = () => {
    Linking.openURL('https://maps.google.com/?q=Baghdad,Iraq');
  };

  const handleWhatsAppContact = () => {
    Linking.openURL('https://wa.me/9647700000000?text=السلام%20عليكم%20معرض%20الأصدقاء%20للسيارات');
  };

  // 1. Splash Screen
  if (!initialized) {
    return (
      <View style={styles.splashContainer}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
        <View style={styles.splashCircle}>
          <Award size={64} color={colors.accent} />
        </View>
        <Text style={styles.splashBrand}>الأصدقاء للسيارات</Text>
        <Text style={styles.splashTitle}>Al-Asdeqa Auto</Text>
        <ActivityIndicator size="small" color={colors.accent} style={{ marginTop: 24 }} />
      </View>
    );
  }

  // 2. Onboarding / Welcome Screen
  if (showWelcome) {
    return (
      <View style={styles.welcomeContainer}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
        <View style={styles.welcomeInfo}>
          <View style={styles.welcomeLogoCircle}>
            <Award size={48} color={colors.accent} />
          </View>
          <Text style={styles.welcomeHeader}>معرض الأصدقاء للسيارات</Text>
          <Text style={styles.welcomeSub}>سيارتك المثالية بأفضل عروض التقسيط والدفع المباشر</Text>
        </View>

        <View style={styles.welcomeActions}>
          <Button
            title="تصفح السيارات المتوفرة"
            onPress={() => setShowWelcome(false)}
            variant="primary"
            style={styles.welcomeBtn}
          />
          <Button
            title="بوابة الزبائن والأقساط"
            onPress={() => {
              setShowWelcome(false);
              setCurrentTab('portal');
            }}
            variant="outline"
            style={styles.welcomeBtn}
          />
          <Button
            title="اتصال مباشر واتساب"
            onPress={handleWhatsAppContact}
            variant="accent"
            icon={<PhoneCall size={18} color={colors.white} />}
            style={styles.welcomeBtn}
          />
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      
      {/* Active Screen Rendering */}
      <View style={styles.mainView}>
        {/* Tab 1: Showroom */}
        {currentTab === 'showroom' && (
          selectedVehicleId ? (
            <VehicleDetailsScreen
              vehicleId={selectedVehicleId}
              onBack={() => setSelectedVehicleId(null)}
              isFavorite={favoritesList.includes(selectedVehicleId)}
              onToggleFavorite={() => favoriteStore.toggleFavorite(selectedVehicleId)}
            />
          ) : (
            <PublicShowroomScreen
              onSelectVehicle={setSelectedVehicleId}
              favorites={favoritesList}
              onToggleFavorite={id => favoriteStore.toggleFavorite(id)}
            />
          )
        )}

        {/* Tab 2: Favorites */}
        {currentTab === 'favorites' && (
          <View style={styles.tabContainer}>
            <View style={styles.tabHeader}>
              <Text style={styles.tabHeaderTitle}>السيارات المفضلة</Text>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              {favoritesList.length === 0 ? (
                <View style={styles.centerContainer}>
                  <Heart size={48} color={colors.border} />
                  <Text style={styles.centerText}>لا توجد سيارات في المفضلة حالياً.</Text>
                </View>
              ) : (
                allVehicles
                  .filter(v => favoritesList.includes(v.id))
                  .map(v => (
                    <TouchableOpacity
                      key={v.id}
                      activeOpacity={0.9}
                      onPress={() => {
                        setSelectedVehicleId(v.id);
                        setCurrentTab('showroom');
                      }}
                      style={styles.favCard}
                    >
                      <View style={styles.favDetails}>
                        <Text style={styles.favBrand}>{v.brand} {v.model}</Text>
                        <Text style={styles.favPrice}>{formatCurrency(v.price, 'USD')}</Text>
                        <Badge label={v.status === 'Available' ? 'متوفرة' : 'مباعة'} type={v.status === 'Available' ? 'success' : 'danger'} />
                      </View>
                      <Image
                        source={v.images?.length > 0 ? { uri: `http://100.75.153.105/static/uploads/vehicles/${v.images[0].filename}` } : undefined}
                        style={styles.favImage}
                      />
                    </TouchableOpacity>
                  ))
              )}
            </ScrollView>
          </View>
        )}

        {/* Tab 3: Customer Portal */}
        {currentTab === 'portal' && (
          !authProfile ? (
            <CustomerLoginScreen onSuccess={() => setActivePortalScreen('dashboard')} />
          ) : (
            activePortalScreen === 'installments' ? (
              <InstallmentsScreen onBack={() => setActivePortalScreen('dashboard')} />
            ) : activePortalScreen === 'payments' ? (
              <PaymentsScreen onBack={() => setActivePortalScreen('dashboard')} />
            ) : (
              <View style={styles.tabContainer}>
                <View style={styles.portalHeader}>
                  <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
                    <LogOut size={20} color={colors.danger} />
                  </TouchableOpacity>
                  <Text style={styles.tabHeaderTitle}>حسابي المالي</Text>
                </View>
                <CustomerDashboardScreen
                  customerName={authProfile.name}
                  onNavigate={screen => setActivePortalScreen(screen as any)}
                />
              </View>
            )
          )
        )}

        {/* Tab 4: Contact / Profile */}
        {currentTab === 'contact' && (
          <ScrollView contentContainerStyle={styles.tabContainer}>
            <View style={styles.tabHeader}>
              <Text style={styles.tabHeaderTitle}>معلومات المعرض</Text>
            </View>
            
            <View style={styles.contactDetails}>
              <Award size={48} color={colors.accent} style={{ alignSelf: 'center', marginBottom: 12 }} />
              <Text style={styles.contactBrand}>الأصدقاء للسيارات (Al-Asdeqa Auto)</Text>
              <Text style={styles.contactSub}>العنوان: العراق، بغداد، شارع الكندي</Text>

              <View style={styles.contactCard}>
                <View style={styles.contactInfoRow}>
                  <Text style={styles.contactValue}>من 9:00 صباحاً إلى 9:00 مساءً</Text>
                  <Clock size={18} color={colors.accent} />
                </View>
                <View style={styles.contactInfoRow}>
                  <Text style={styles.contactValue}>بغداد، العراق</Text>
                  <MapPin size={18} color={colors.accent} />
                </View>
              </View>

              <Button
                title="موقع المعرض على الخريطة"
                onPress={handleMap}
                variant="outline"
                icon={<MapPin size={18} color={colors.primary} />}
                style={styles.contactBtn}
              />
              <Button
                title="اتصال مباشر بالهاتف"
                onPress={handleCall}
                variant="primary"
                icon={<PhoneCall size={18} color={colors.white} />}
                style={styles.contactBtn}
              />
              <Button
                title="مراسلة واتساب الفورية"
                onPress={handleWhatsAppContact}
                variant="accent"
                style={styles.contactBtn}
              />
            </View>
          </ScrollView>
        )}
      </View>

      {/* Bottom Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          onPress={() => {
            setCurrentTab('contact');
            setSelectedVehicleId(null);
          }}
          style={[styles.tabItem, currentTab === 'contact' && styles.tabItemActive]}
        >
          <PhoneCall size={20} color={currentTab === 'contact' ? colors.accent : colors.secondary} />
          <Text style={[styles.tabLabel, currentTab === 'contact' && styles.tabLabelActive]}>اتصل بنا</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            setCurrentTab('portal');
            setSelectedVehicleId(null);
          }}
          style={[styles.tabItem, currentTab === 'portal' && styles.tabItemActive]}
        >
          <User size={20} color={currentTab === 'portal' ? colors.accent : colors.secondary} />
          <Text style={[styles.tabLabel, currentTab === 'portal' && styles.tabLabelActive]}>أقساطي</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            setCurrentTab('favorites');
            setSelectedVehicleId(null);
          }}
          style={[styles.tabItem, currentTab === 'favorites' && styles.tabItemActive]}
        >
          <Heart size={20} color={currentTab === 'favorites' ? colors.accent : colors.secondary} />
          <Text style={[styles.tabLabel, currentTab === 'favorites' && styles.tabLabelActive]}>المفضلة</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            setCurrentTab('showroom');
            setSelectedVehicleId(null);
          }}
          style={[styles.tabItem, currentTab === 'showroom' && styles.tabItemActive]}
        >
          <Compass size={20} color={currentTab === 'showroom' ? colors.accent : colors.secondary} />
          <Text style={[styles.tabLabel, currentTab === 'showroom' && styles.tabLabelActive]}>المعرض</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  splashContainer: {
    flex: 1,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.accent,
    marginBottom: 20,
  },
  splashBrand: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.white,
  },
  splashTitle: {
    fontSize: 14,
    color: colors.accent,
    marginTop: 4,
    fontWeight: '600',
  },
  welcomeContainer: {
    flex: 1,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    padding: 24,
  },
  welcomeInfo: {
    alignItems: 'center',
    marginBottom: 40,
  },
  welcomeLogoCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.accent,
    marginBottom: 16,
  },
  welcomeHeader: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.white,
    textAlign: 'center',
  },
  welcomeSub: {
    fontSize: 13,
    color: colors.secondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  welcomeActions: {
    gap: 12,
  },
  welcomeBtn: {
    width: '100%',
  },
  mainView: {
    flex: 1,
  },
  tabBar: {
    height: 60,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 4,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: '100%',
  },
  tabItemActive: {
    borderTopWidth: 2,
    borderTopColor: colors.accent,
  },
  tabLabel: {
    fontSize: 9,
    color: colors.secondary,
    marginTop: 4,
    fontWeight: 'bold',
  },
  tabLabelActive: {
    color: colors.accent,
  },
  tabContainer: {
    flex: 1,
  },
  tabHeader: {
    height: 56,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabHeaderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  portalHeader: {
    height: 56,
    backgroundColor: colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  logoutBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  centerText: {
    fontSize: 14,
    color: colors.secondary,
  },
  favCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
    overflow: 'hidden',
  },
  favImage: {
    width: 120,
    height: 80,
    backgroundColor: colors.border,
  },
  favDetails: {
    flex: 1,
    padding: 12,
    alignItems: 'flex-end', // RTL
    justifyContent: 'center',
    gap: 4,
  },
  favBrand: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
  },
  favPrice: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.accent,
  },
  contactDetails: {
    padding: 24,
    alignItems: 'center',
  },
  contactBrand: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'center',
  },
  contactSub: {
    fontSize: 12,
    color: colors.secondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  contactCard: {
    width: '100%',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    marginBottom: 20,
  },
  contactInfoRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contactValue: {
    fontSize: 12,
    color: colors.text,
  },
  contactBtn: {
    width: '100%',
    marginBottom: 10,
  },
});
