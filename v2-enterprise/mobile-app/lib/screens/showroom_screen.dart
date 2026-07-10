import 'package:flutter/material.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../theme/colors.dart';
import '../services/api_service.dart';
import 'add_edit_vehicle_screen.dart';
import 'tabs/showroom_tab.dart';
import 'tabs/financials_tab.dart';
import 'tabs/messages_tab.dart';
import 'tabs/profile_tab.dart';
import '../logic/providers/showroom_provider.dart';
import '../logic/providers/installments_provider.dart';

class ShowroomScreen extends StatefulWidget {
  final ApiService apiService;

  const ShowroomScreen({
    Key? key,
    required this.apiService,
  }) : super(key: key);

  @override
  State<ShowroomScreen> createState() => _ShowroomScreenState();
}

class _ShowroomScreenState extends State<ShowroomScreen> {
  static const String _contactPhoneNumber = '+9647719681434';

  int _currentTab = 0; // 0: Showroom, 1: Installments, 2: Messages, 3: Profile
  bool _isManager = false;
  String _customerName = '';
  String? _customerEmail;
  String? _customerPhotoUrl;

  Future<void> _launchUrl(String urlString) async {
    final uri = Uri.parse(urlString);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  void initState() {
    super.initState();
    _checkManagerStatus();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ShowroomProvider>().loadVehicles();
      context.read<InstallmentsProvider>().loadFinancialData();
    });
  }

  Future<void> _checkManagerStatus() async {
    final prefs = await SharedPreferences.getInstance();
    final name = prefs.getString('customer_name') ?? 'عميلنا العزيز';
    final email = prefs.getString('customer_email');
    final photoUrl = prefs.getString('customer_photo_url');
    final isNameManager = name.toLowerCase().contains('مدير') ||
        name.toLowerCase().contains('admin') ||
        name.toLowerCase().contains('owner') ||
        name.toLowerCase().contains('شريك');
    setState(() {
      _isManager = isNameManager;
      _customerName = name;
      _customerEmail = email;
      _customerPhotoUrl = photoUrl;
    });
  }

  Widget _buildCenterActionButton() {
    return GestureDetector(
      onTap: () {
        if (_isManager) {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (context) => AddEditVehicleScreen(
                apiService: widget.apiService,
                onSaved: () {
                  setState(() {
                    _currentTab = 0;
                  });
                  context
                      .read<ShowroomProvider>()
                      .loadVehicles(forceRefresh: true);
                },
              ),
            ),
          );
        } else {
          showModalBottomSheet(
            context: context,
            backgroundColor: AppColors.luxCard,
            shape: const RoundedRectangleBorder(
              borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
            ),
            builder: (context) => Container(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text(
                    'تواصل مع شركة الاصدقاء',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: AppColors.luxText,
                      fontFamily: 'Cairo',
                    ),
                  ),
                  const SizedBox(height: 16),
                  ListTile(
                    leading: const Icon(Icons.phone, color: AppColors.luxAccent),
                    title: const Text('اتصال مباشر بالشركة',
                        style: TextStyle(
                            color: AppColors.luxText, fontFamily: 'Cairo')),
                    trailing: const Icon(Icons.chevron_right,
                        color: AppColors.luxTextMuted),
                    onTap: () {
                      Navigator.pop(context);
                      _launchUrl('tel:$_contactPhoneNumber');
                    },
                  ),
                  ListTile(
                    leading: const Icon(Icons.chat, color: Colors.green),
                    title: const Text('محادثة عبر الواتساب',
                        style: TextStyle(
                            color: AppColors.luxText, fontFamily: 'Cairo')),
                    trailing: const Icon(Icons.chevron_right,
                        color: AppColors.luxTextMuted),
                    onTap: () {
                      Navigator.pop(context);
                      _launchUrl(
                          'https://wa.me/${_contactPhoneNumber.replaceFirst('+', '')}');
                    },
                  ),
                ],
              ),
            ),
          );
        }
      },
      child: Container(
        width: 48,
        height: 48,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: const LinearGradient(
            colors: [AppColors.luxAccent, AppColors.luxAccentDeep],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
          boxShadow: [
            BoxShadow(
              color: AppColors.luxAccent.withOpacity(0.35),
              blurRadius: 18,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: const Icon(
          LucideIcons.plus,
          color: Colors.black,
          size: 24,
        ),
      ),
    );
  }

  Widget _buildCustomTabItem(int index, IconData icon, String label) {
    final bool isActive = _currentTab == index;
    return GestureDetector(
      onTap: () {
        setState(() {
          _currentTab = index;
        });
      },
      behavior: HitTestBehavior.opaque,
      child: SizedBox(
        width: 60,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              color: isActive ? AppColors.luxAccent : AppColors.luxTextMuted,
              size: 22,
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
                color: isActive ? AppColors.luxAccent : AppColors.luxTextMuted,
                fontFamily: 'Cairo',
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBody: true,
      backgroundColor: AppColors.luxBg,
      body: IndexedStack(
        index: _currentTab,
        children: [
          ShowroomTab(
            isManager: _isManager,
            customerName: _customerName,
            customerEmail: _customerEmail,
            customerPhotoUrl: _customerPhotoUrl,
            apiService: widget.apiService,
          ),
          FinancialsTab(apiService: widget.apiService),
          MessagesTab(
            customerPhotoUrl: _customerPhotoUrl,
            isManager: _isManager,
            apiService: widget.apiService,
          ),
          ProfileTab(
            customerName: _customerName,
            customerEmail: _customerEmail,
            customerPhotoUrl: _customerPhotoUrl,
            apiService: widget.apiService,
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        top: false,
        child: Container(
          margin: const EdgeInsets.fromLTRB(16, 0, 16, 14),
          height: 70,
          decoration: BoxDecoration(
            color: AppColors.luxCard,
            borderRadius: BorderRadius.circular(35),
            border: Border.all(color: AppColors.luxBorder, width: 1),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.4),
                blurRadius: 22,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              _buildCustomTabItem(0, LucideIcons.house, 'الرئيسية'),
              _buildCustomTabItem(1, LucideIcons.calendar, 'الأقساط'),
              _buildCenterActionButton(),
              _buildCustomTabItem(2, LucideIcons.message_circle, 'الرسائل'),
              _buildCustomTabItem(3, LucideIcons.user, 'المستخدم'),
            ],
          ),
        ),
      ),
    );
  }
}
