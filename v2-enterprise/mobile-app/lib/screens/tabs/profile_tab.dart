import 'package:flutter/material.dart';
import 'package:flutter_lucide/flutter_lucide.dart';

import '../../theme/colors.dart';
import '../login_screen.dart';
import '../welcome_screen.dart';

class ProfileTab extends StatelessWidget {
  final String customerName;
  final String? customerEmail;
  final String? customerPhotoUrl;
  final dynamic apiService;

  const ProfileTab({
    super.key,
    required this.customerName,
    this.customerEmail,
    this.customerPhotoUrl,
    required this.apiService,
  });

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Container(
        color: AppColors.luxBg,
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 54, 20, 112),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  _roundIcon(LucideIcons.user_round),
                  const Spacer(),
                  const Text(
                    'الملف الشخصي',
                    style: TextStyle(
                      color: AppColors.luxText,
                      fontSize: 21,
                      fontWeight: FontWeight.w800,
                      fontFamily: 'Cairo',
                    ),
                  ),
                  const Spacer(),
                  _roundIcon(LucideIcons.ellipsis_vertical),
                ],
              ),
              const SizedBox(height: 36),
              Center(
                child: Container(
                  width: 100,
                  height: 100,
                  decoration: BoxDecoration(
                    color: AppColors.luxCardAlt,
                    shape: BoxShape.circle,
                    border: Border.all(color: AppColors.luxAccent, width: 2),
                  ),
                  foregroundDecoration: customerPhotoUrl == null
                      ? null
                      : BoxDecoration(
                          shape: BoxShape.circle,
                          image: DecorationImage(
                            image: NetworkImage(customerPhotoUrl!),
                            fit: BoxFit.cover,
                          ),
                        ),
                  child: const Icon(
                    LucideIcons.user_round,
                    color: AppColors.luxTextMuted,
                    size: 42,
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                customerName.isEmpty ? 'عميل شركة الاصدقاء' : customerName,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: AppColors.luxText,
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  fontFamily: 'Cairo',
                ),
              ),
              const SizedBox(height: 4),
              Text(
                customerEmail ?? 'حساب السيارات والأقساط',
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: AppColors.luxTextMuted,
                  fontSize: 12,
                  fontFamily: 'Cairo',
                ),
              ),
              const SizedBox(height: 34),
              const Text(
                'الحساب',
                style: TextStyle(
                  color: AppColors.luxTextMuted,
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  fontFamily: 'Cairo',
                ),
              ),
              const SizedBox(height: 10),
              _profileAction(
                icon: LucideIcons.user_pen,
                title: 'تعديل المعلومات',
                subtitle: 'تحديث بيانات الحساب',
              ),
              const SizedBox(height: 10),
              _profileAction(
                icon: LucideIcons.bell,
                title: 'التنبيهات',
                subtitle: 'تذكيرات الأقساط والعروض',
              ),
              const SizedBox(height: 22),
              SizedBox(
                height: 50,
                child: OutlinedButton.icon(
                  onPressed: () async {
                    await apiService.logout();
                    if (!context.mounted) return;
                    Navigator.of(context).pushAndRemoveUntil(
                      MaterialPageRoute(
                        builder: (context) => WelcomeScreen(
                          onLoginPressed: () {
                            Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (context) =>
                                    LoginScreen(apiService: apiService),
                              ),
                            );
                          },
                        ),
                      ),
                      (route) => false,
                    );
                  },
                  icon: const Icon(
                    LucideIcons.log_out,
                    color: AppColors.danger,
                    size: 18,
                  ),
                  label: const Text(
                    'تسجيل الخروج',
                    style: TextStyle(
                      color: AppColors.danger,
                      fontWeight: FontWeight.w800,
                      fontSize: 13,
                      fontFamily: 'Cairo',
                    ),
                  ),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: AppColors.danger),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(25),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _roundIcon(IconData icon) {
    return Container(
      width: 52,
      height: 52,
      decoration: BoxDecoration(
        color: AppColors.luxCard,
        shape: BoxShape.circle,
        border: Border.all(color: AppColors.luxBorder),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.28),
            blurRadius: 14,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Icon(
        icon,
        color: AppColors.luxText,
        size: 21,
      ),
    );
  }

  Widget _softIcon(IconData icon) {
    return Container(
      width: 48,
      height: 48,
      decoration: BoxDecoration(
        color: AppColors.luxAccentSoft,
        shape: BoxShape.circle,
        border: Border.all(color: AppColors.luxBorder),
      ),
      child: Icon(
        icon,
        color: AppColors.luxAccent,
        size: 22,
      ),
    );
  }

  Widget _profileAction({
    required IconData icon,
    required String title,
    required String subtitle,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.luxCard,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: AppColors.luxBorder),
      ),
      child: Row(
        children: [
          _softIcon(icon),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    color: AppColors.luxText,
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    fontFamily: 'Cairo',
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: const TextStyle(
                    color: AppColors.luxTextMuted,
                    fontSize: 11,
                    fontFamily: 'Cairo',
                  ),
                ),
              ],
            ),
          ),
          const Icon(
            LucideIcons.chevron_left,
            color: AppColors.luxTextMuted,
            size: 20,
          ),
        ],
      ),
    );
  }
}
