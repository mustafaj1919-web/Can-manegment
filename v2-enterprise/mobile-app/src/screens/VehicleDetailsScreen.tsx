import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, Linking, Modal, Alert } from 'react-native';
import { ArrowRight, Heart, Calendar, Phone, Share2, Compass, Cpu, Settings } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { Vehicle } from '../types/vehicle';
import { vehicleService } from '../services/vehicleService';
import { formatCurrency } from '../utils/formatCurrency';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

interface VehicleDetailsScreenProps {
  vehicleId: string;
  onBack: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

export const VehicleDetailsScreen: React.FC<VehicleDetailsScreenProps> = ({
  vehicleId,
  onBack,
  isFavorite,
  onToggleFavorite,
}) => {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Visit Request Modal State
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [visitDate, setVisitDate] = useState(new Date().toISOString().slice(0, 10));
  const [submittingVisit, setSubmittingVisit] = useState(false);

  // WhatsApp Inquiry Modal State / Action
  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const [inquiryName, setInquiryName] = useState('');
  const [inquiryPhone, setInquiryPhone] = useState('');
  const [inquiryMessage, setInquiryMessage] = useState('السلام عليكم، أود الاستفسار عن هذه السيارة وتفاصيل بيعها.');
  const [submittingInquiry, setSubmittingInquiry] = useState(false);

  const fetchDetails = async () => {
    setLoading(true);
    const res = await vehicleService.getVehicleDetails(vehicleId);
    if (res.success && res.data) {
      setVehicle(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDetails();
  }, [vehicleId]);

  const handleWhatsAppPress = async () => {
    if (!vehicle) return;
    setShowInquiryModal(true);
  };

  const submitWhatsApp = async () => {
    if (!vehicle) return;
    if (!inquiryName.trim() || !inquiryPhone.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال الاسم ورقم الهاتف.');
      return;
    }
    setSubmittingInquiry(true);
    
    // Register lead in backend CRM
    await vehicleService.submitLead(inquiryName, inquiryPhone, vehicle.id, inquiryMessage);
    
    setSubmittingInquiry(false);
    setShowInquiryModal(false);

    // Open WhatsApp
    const message = `السلام عليكم، أنا ${inquiryName}. أستفسر عن سيارة ${vehicle.brand} ${vehicle.model} موديل ${vehicle.year}.\nالرابط: http://100.75.153.105/showroom/${vehicle.id}`;
    const url = `whatsapp://send?text=${encodeURIComponent(message)}`;
    
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      // Fallback web WhatsApp
      await Linking.openURL(`https://wa.me/?text=${encodeURIComponent(message)}`);
    }
  };

  const handleBookVisit = async () => {
    if (!visitorName.trim() || !visitorPhone.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال الاسم ورقم الهاتف للزيارة.');
      return;
    }
    setSubmittingVisit(true);
    
    const res = await vehicleService.submitVisitRequest(visitorName, visitorPhone, vehicleId, visitDate);
    
    setSubmittingVisit(false);
    if (res.success) {
      setShowVisitModal(false);
      Alert.alert('نجاح', 'تم حجز موعد الزيارة بنجاح. سيتواصل معك فريق المبيعات لتأكيد الموعد.');
      setVisitorName('');
      setVisitorPhone('');
    } else {
      Alert.alert('خطأ', res.message || 'حدث خطأ أثناء حجز الموعد.');
    }
  };

  const handleShare = async () => {
    if (!vehicle) return;
    const url = `http://100.75.153.105/showroom/${vehicle.id}`;
    Alert.alert('مشاركة السيارة', `رابط السيارة للتصفح:\n${url}`);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>جاري تحميل تفاصيل السيارة...</Text>
      </View>
    );
  }

  if (!vehicle) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>لم نتمكن من العثور على السيارة المطلوبة.</Text>
        <Button title="رجوع للمعرض" onPress={onBack} style={{ marginTop: 16 }} />
      </View>
    );
  }

  const primaryImage = vehicle.images && vehicle.images.length > 0
    ? `http://100.75.153.105/static/uploads/vehicles/${vehicle.images[0].filename}`
    : null;

  return (
    <View style={styles.container}>
      {/* Custom Navigation Header */}
      <View style={styles.navHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <ArrowRight size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>{vehicle.brand} {vehicle.model}</Text>
        <TouchableOpacity onPress={onToggleFavorite} style={styles.favoriteButton}>
          <Heart size={20} color={isFavorite ? colors.danger : colors.primary} fill={isFavorite ? colors.danger : 'transparent'} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Main Cover Image */}
        <View style={styles.imageWrapper}>
          {primaryImage ? (
            <Image source={{ uri: primaryImage }} style={styles.coverImage} resizeMode="cover" />
          ) : (
            <View style={styles.placeholderCover}>
              <Text style={styles.placeholderText}>لا توجد صورة متوفرة</Text>
            </View>
          )}
          <Badge
            label={vehicle.status === 'Available' ? 'متوفرة للبيع' : vehicle.status === 'Reserved' ? 'محجوزة' : 'مباعة'}
            type={vehicle.status === 'Available' ? 'success' : vehicle.status === 'Reserved' ? 'warning' : 'danger'}
            style={styles.floatingStatus}
          />
        </View>

        {/* Pricing & Brand */}
        <View style={styles.cardSection}>
          <View style={styles.priceRow}>
            <Text style={styles.priceVal}>{formatCurrency(vehicle.price, 'USD')}</Text>
            <View style={styles.titleInfo}>
              <Text style={styles.brandName}>{vehicle.brand}</Text>
              <Text style={styles.modelName}>{vehicle.model} · {vehicle.year}</Text>
            </View>
          </View>
        </View>

        {/* Core Specs Grid */}
        <View style={styles.gridSection}>
          <View style={styles.specBox}>
            <Compass size={20} color={colors.accent} />
            <Text style={styles.specLabel}>الممشى</Text>
            <Text style={styles.specVal}>{vehicle.mileage !== undefined ? `${vehicle.mileage.toLocaleString()} كم` : 'جديدة'}</Text>
          </View>
          <View style={styles.specBox}>
            <Cpu size={20} color={colors.accent} />
            <Text style={styles.specLabel}>المحرك</Text>
            <Text style={styles.specVal}>{vehicle.engine || 'غير محدد'}</Text>
          </View>
          <View style={styles.specBox}>
            <Settings size={20} color={colors.accent} />
            <Text style={styles.specLabel}>الناقل</Text>
            <Text style={styles.specVal}>{vehicle.transmission === 'Automatic' ? 'أوتوماتيك' : 'عادي'}</Text>
          </View>
        </View>

        {/* Additional Specs Details */}
        <View style={styles.detailsCard}>
          <Text style={styles.detailsCardTitle}>المواصفات الفنية</Text>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailValue}>{vehicle.color || 'غير محدد'}</Text>
            <Text style={styles.detailLabel}>اللون الخارجي</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailValue}>{vehicle.fuel_type || 'غير محدد'}</Text>
            <Text style={styles.detailLabel}>نوع الوقود</Text>
          </View>
          {vehicle.notes && (
            <View style={styles.notesContainer}>
              <Text style={styles.notesLabel}>ملاحظات إضافية</Text>
              <Text style={styles.notesText}>{vehicle.notes}</Text>
            </View>
          )}
        </View>

        {/* Action Buttons Section */}
        <View style={styles.actionsContainer}>
          <Button
            title="تواصل معنا عبر واتساب"
            onPress={handleWhatsAppPress}
            variant="accent"
            icon={<Phone size={18} color={colors.white} />}
            style={styles.actionBtn}
          />
          <Button
            title="طلب حجز موعد زيارة / فحص"
            onPress={() => setShowVisitModal(true)}
            variant="outline"
            icon={<Calendar size={18} color={colors.primary} />}
            style={styles.actionBtn}
          />
          <Button
            title="مشاركة رابط السيارة"
            onPress={handleShare}
            variant="ghost"
            icon={<Share2 size={16} color={colors.primary} />}
            style={styles.shareBtn}
          />
        </View>
      </ScrollView>

      {/* Book Visit Modal */}
      <Modal visible={showVisitModal} transparent animationType="slide" onRequestClose={() => setShowVisitModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>حجز موعد زيارة أو فحص سيارة</Text>
            <Text style={styles.modalSub}>املأ البيانات وسيقوم ممثل المعرض بالتواصل معك</Text>

            <Input label="الاسم الكامل *" value={visitorName} onChangeText={setVisitorName} placeholder="أدخل اسمك هنا..." />
            <Input label="رقم الهاتف *" value={visitorPhone} onChangeText={setVisitorPhone} placeholder="07XXXXXXXX..." keyboardType="phone-pad" />
            <Input label="تاريخ الزيارة المقترح *" value={visitDate} onChangeText={setVisitDate} placeholder="YYYY-MM-DD" />

            <View style={styles.modalButtons}>
              <Button title="تأكيد حجز الموعد" onPress={handleBookVisit} loading={submittingVisit} style={{ flex: 1 }} />
              <Button title="إلغاء" onPress={() => setShowVisitModal(false)} variant="ghost" />
            </View>
          </View>
        </View>
      </Modal>

      {/* Lead Inquiry Modal (WhatsApp Auth) */}
      <Modal visible={showInquiryModal} transparent animationType="slide" onRequestClose={() => setShowInquiryModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>استفسار واتساب مباشر</Text>
            <Text style={styles.modalSub}>أدخل بياناتك وسيتم توجيهك مباشرة للواتساب وسجل مبيعاتنا</Text>

            <Input label="اسمك الكريم *" value={inquiryName} onChangeText={setInquiryName} placeholder="أدخل اسمك هنا..." />
            <Input label="رقم هاتف الواتساب *" value={inquiryPhone} onChangeText={setInquiryPhone} placeholder="07XXXXXXXX..." keyboardType="phone-pad" />
            
            <View style={styles.modalButtons}>
              <Button title="توجيه إلى واتساب" onPress={submitWhatsApp} loading={submittingInquiry} style={{ flex: 1 }} />
              <Button title="إلغاء" onPress={() => setShowInquiryModal(false)} variant="ghost" />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  navHeader: {
    height: 56,
    backgroundColor: colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    maxWidth: '60%',
  },
  favoriteButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  imageWrapper: {
    height: 240,
    position: 'relative',
    backgroundColor: colors.border,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  placeholderCover: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: colors.secondary,
    fontWeight: 'bold',
  },
  floatingStatus: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    zIndex: 10,
  },
  cardSection: {
    backgroundColor: colors.card,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceVal: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.accent,
  },
  titleInfo: {
    alignItems: 'flex-end', // RTL
  },
  brandName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  modelName: {
    fontSize: 13,
    color: colors.secondary,
    marginTop: 2,
  },
  gridSection: {
    flexDirection: 'row-reverse', // RTL
    justifyContent: 'space-between',
    padding: 16,
    gap: 12,
  },
  specBox: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    alignItems: 'center',
  },
  specLabel: {
    fontSize: 10,
    color: colors.secondary,
    marginVertical: 4,
  },
  specVal: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.text,
  },
  detailsCard: {
    backgroundColor: colors.card,
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  detailsCardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'right',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    fontSize: 12,
    color: colors.secondary,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  notesContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'right',
  },
  notesText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
    textAlign: 'right',
    lineHeight: 16,
  },
  actionsContainer: {
    paddingHorizontal: 16,
    marginTop: 20,
    gap: 10,
  },
  actionBtn: {
    width: '100%',
  },
  shareBtn: {
    width: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    fontSize: 14,
    color: colors.secondary,
    marginTop: 10,
  },
  errorText: {
    fontSize: 14,
    color: colors.danger,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'right',
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 12,
    color: colors.secondary,
    textAlign: 'right',
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row-reverse',
    gap: 10,
    marginTop: 16,
  },
});
