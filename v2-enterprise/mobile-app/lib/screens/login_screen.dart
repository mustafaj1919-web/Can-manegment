import 'package:flutter/material.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:url_launcher/url_launcher.dart';

import '../services/api_service.dart';
import '../theme/colors.dart';
import 'showroom_screen.dart';

class LoginScreen extends StatefulWidget {
  final ApiService apiService;

  const LoginScreen({
    Key? key,
    required this.apiService,
  }) : super(key: key);

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final GoogleSignIn _googleSignIn = GoogleSignIn(
    scopes: ['email', 'profile'],
    serverClientId:
        '351563104995-scshrqro5ue0mkama3dms0avf1fqscl4.apps.googleusercontent.com',
  );
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;
  bool _isGoogleLoading = false;
  bool _rememberMe = false;
  bool _obscurePassword = true;
  String? _googlePhotoUrl;
  String? _googleName;
  String? _errorMessage;

  Future<void> _handleLogin() async {
    final phone = _phoneController.text.trim();
    final password = _passwordController.text.trim();

    if (phone.isEmpty || password.isEmpty) {
      setState(() {
        _errorMessage = 'يرجى إدخال رقم الهاتف ورقم الهوية';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final result = await widget.apiService.login(phone, password);
    if (!mounted) return;

    setState(() {
      _isLoading = false;
    });

    if (result['success'] == true) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'مرحباً بك، ${result['customerName']}! تم تسجيل الدخول بنجاح.',
            textAlign: TextAlign.right,
          ),
          backgroundColor: AppColors.warmAccentDeep,
        ),
      );

      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(
          builder: (context) => ShowroomScreen(
            apiService: widget.apiService,
          ),
        ),
        (route) => false,
      );
    } else {
      setState(() {
        _errorMessage = result['message'] ?? 'بيانات الدخول غير صحيحة';
      });
    }
  }

  Future<void> _handleGoogleLogin() async {
    setState(() {
      _isGoogleLoading = true;
      _errorMessage = null;
    });

    try {
      final account = await _googleSignIn.signIn();
      if (!mounted) return;

      if (account == null) {
        setState(() => _isGoogleLoading = false);
        return;
      }

      final auth = await account.authentication;
      final idToken = auth.idToken;
      if (idToken == null) {
        if (!mounted) return;
        setState(() {
          _isGoogleLoading = false;
          _errorMessage = 'تعذر الحصول على رمز التحقق من Google، يرجى إعادة المحاولة.';
        });
        return;
      }

      final result = await widget.apiService.loginWithGoogle(idToken);
      if (!mounted) return;

      if (result['success'] != true) {
        setState(() {
          _isGoogleLoading = false;
          _errorMessage = result['message'] ?? 'تعذر تسجيل الدخول عبر Google.';
        });
        return;
      }

      setState(() {
        _googlePhotoUrl = account.photoUrl;
        _googleName = result['customerName'] ?? account.displayName ?? account.email;
        _isGoogleLoading = false;
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'تم تسجيل الدخول عبر Google: ${result['customerName'] ?? account.email}',
            textAlign: TextAlign.right,
          ),
          backgroundColor: AppColors.showroomPurple,
        ),
      );

      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(
          builder: (context) => ShowroomScreen(
            apiService: widget.apiService,
          ),
        ),
        (route) => false,
      );
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _isGoogleLoading = false;
        _errorMessage =
            'تعذر تسجيل الدخول عبر Google. تأكد من تفعيل إعدادات Google Sign-In للتطبيق.';
      });
    }
  }

  @override
  void dispose() {
    _phoneController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: AppColors.softBackground,
        body: Stack(
          children: [
            Positioned(
              top: -92,
              right: -72,
              child: _softGlow(
                size: 260,
                color: AppColors.warmAccent,
                opacity: 0.13,
              ),
            ),
            Positioned(
              bottom: -90,
              left: -110,
              child: _softGlow(
                size: 320,
                color: AppColors.warmAccentDeep,
                opacity: 0.08,
              ),
            ),
            SafeArea(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      children: [
                        _roundIconButton(
                          icon: LucideIcons.chevron_right,
                          onTap: () => Navigator.of(context).pop(),
                        ),
                        const Spacer(),
                        const Text(
                          'تسجيل الدخول',
                          style: TextStyle(
                            color: AppColors.textPrimary,
                            fontSize: 21,
                            fontWeight: FontWeight.w800,
                            fontFamily: 'Cairo',
                          ),
                        ),
                        const Spacer(),
                        const SizedBox(width: 52),
                      ],
                    ),
                    const SizedBox(height: 30),
                    Center(
                      child: Container(
                        width: 96,
                        height: 96,
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: AppColors.softSurface,
                          borderRadius: BorderRadius.circular(24),
                          border: Border.all(color: AppColors.softBorder),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.05),
                              blurRadius: 18,
                              offset: const Offset(0, 10),
                            ),
                          ],
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(18),
                          child: _googlePhotoUrl == null
                              ? Image.asset(
                                  'assets/images/app_logo.png',
                                  fit: BoxFit.contain,
                                )
                              : Image.network(
                                  _googlePhotoUrl!,
                                  fit: BoxFit.cover,
                                  errorBuilder: (_, __, ___) => Image.asset(
                                    'assets/images/app_logo.png',
                                    fit: BoxFit.contain,
                                  ),
                                ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 34),
                    Container(
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        color: AppColors.softSurface,
                        borderRadius: BorderRadius.circular(30),
                        border: Border.all(color: AppColors.softBorder),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.05),
                            blurRadius: 24,
                            offset: const Offset(0, 14),
                          ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          const Text(
                            'أهلاً بك من جديد',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: AppColors.textPrimary,
                              fontSize: 24,
                              fontWeight: FontWeight.w800,
                              fontFamily: 'Cairo',
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            _googleName == null
                                ? 'سجل الدخول عبر Google أو رقم الهاتف لعرض حسابك'
                                : 'مرحباً $_googleName، صورتك من Google ظهرت بالأعلى',
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              color: AppColors.textSecondary,
                              fontSize: 12,
                              height: 1.5,
                              fontFamily: 'Cairo',
                            ),
                          ),
                          const SizedBox(height: 24),
                          _googleLoginButton(),
                          const SizedBox(height: 18),
                          Row(
                            children: [
                              const Expanded(
                                child: Divider(color: AppColors.softBorder),
                              ),
                              Padding(
                                padding:
                                    const EdgeInsets.symmetric(horizontal: 12),
                                child: Text(
                                  'أو الدخول بالبيانات',
                                  style: TextStyle(
                                    color: AppColors.textSecondary,
                                    fontSize: 11,
                                    fontFamily: 'Cairo',
                                  ),
                                ),
                              ),
                              const Expanded(
                                child: Divider(color: AppColors.softBorder),
                              ),
                            ],
                          ),
                          const SizedBox(height: 18),
                          _fieldLabel('رقم الهاتف'),
                          const SizedBox(height: 8),
                          _softTextField(
                            controller: _phoneController,
                            hint: 'أدخل رقم الهاتف المسجل بالمنظومة',
                            icon: LucideIcons.user,
                            keyboardType: TextInputType.phone,
                          ),
                          const SizedBox(height: 20),
                          _fieldLabel('رقم الهوية أو العقد (كلمة المرور)'),
                          const SizedBox(height: 8),
                          _softTextField(
                            controller: _passwordController,
                            hint: 'أدخل رقم الهوية أو العقد المشترك',
                            icon: LucideIcons.lock,
                            obscureText: _obscurePassword,
                            suffix: IconButton(
                              onPressed: () {
                                setState(() {
                                  _obscurePassword = !_obscurePassword;
                                });
                              },
                              icon: Icon(
                                _obscurePassword
                                    ? LucideIcons.eye_off
                                    : LucideIcons.eye,
                                color: AppColors.textSecondary,
                                size: 18,
                              ),
                            ),
                          ),
                          const SizedBox(height: 16),
                          Row(
                            children: [
                              const Text(
                                'نسيت كلمة المرور؟',
                                style: TextStyle(
                                  color: AppColors.warmAccentDeep,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w800,
                                  fontFamily: 'Cairo',
                                ),
                              ),
                              const Spacer(),
                              Text(
                                'تذكرني',
                                style: TextStyle(
                                  color: AppColors.textSecondary,
                                  fontSize: 12,
                                  fontFamily: 'Cairo',
                                ),
                              ),
                              const SizedBox(width: 6),
                              SizedBox(
                                width: 24,
                                height: 24,
                                child: Checkbox(
                                  value: _rememberMe,
                                  onChanged: (val) {
                                    setState(() {
                                      _rememberMe = val ?? false;
                                    });
                                  },
                                  activeColor: AppColors.warmAccentDeep,
                                  checkColor: Colors.white,
                                  side: const BorderSide(
                                    color: Color(0xFFC9CDD3),
                                    width: 1.5,
                                  ),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(7),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          if (_errorMessage != null) ...[
                            const SizedBox(height: 14),
                            Text(
                              _errorMessage!,
                              textAlign: TextAlign.center,
                              style: const TextStyle(
                                color: AppColors.danger,
                                fontSize: 12,
                                fontWeight: FontWeight.w800,
                                fontFamily: 'Cairo',
                              ),
                            ),
                          ],
                          const SizedBox(height: 28),
                          _gradientButton(),
                        ],
                      ),
                    ),
                    const SizedBox(height: 32),
                    Row(
                      children: [
                        const Expanded(
                            child: Divider(color: AppColors.softBorder)),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          child: Text(
                            'للمساعدة والدعم الفني',
                            style: TextStyle(
                              color: AppColors.textSecondary,
                              fontSize: 11,
                              fontFamily: 'Cairo',
                            ),
                          ),
                        ),
                        const Expanded(
                            child: Divider(color: AppColors.softBorder)),
                      ],
                    ),
                    const SizedBox(height: 20),
                    Row(
                      children: [
                        Expanded(
                          child: _supportButton(
                            icon: LucideIcons.map_pin,
                            iconColor: AppColors.warmAccentDeep,
                            label: 'موقع الشركة',
                            onTap: () {
                              _launchSupportUrl(
                                'https://maps.app.goo.gl/o6Vca5uRujd8D7nX6',
                              );
                            },
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: _supportButton(
                            icon: LucideIcons.phone_call,
                            iconColor: AppColors.warmAccent,
                            label: 'تواصل معنا',
                            onTap: () {
                              _launchSupportUrl(
                                'https://wa.me/9647700000000?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D9%8B%20%D8%B4%D8%B1%D9%83%D8%A9%20%D8%A7%D9%84%D8%A7%D8%B5%D8%AF%D9%82%D8%A7%D8%A1%20%D9%84%D8%AA%D8%AC%D8%A7%D8%B1%D8%A9%20%D8%A7%D9%84%D8%B3%D9%8A%D8%A7%D8%B1%D8%A7%D8%AA',
                              );
                            },
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _softGlow({
    required double size,
    required Color color,
    required double opacity,
  }) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: color.withOpacity(opacity),
      ),
    );
  }

  Widget _roundIconButton({
    required IconData icon,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 52,
        height: 52,
        decoration: BoxDecoration(
          color: AppColors.softSurface,
          shape: BoxShape.circle,
          border: Border.all(color: AppColors.softBorder),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.035),
              blurRadius: 14,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Icon(
          icon,
          color: AppColors.textPrimary,
          size: 21,
        ),
      ),
    );
  }

  Widget _fieldLabel(String label) {
    return Text(
      label,
      textAlign: TextAlign.right,
      style: const TextStyle(
        color: AppColors.textPrimary,
        fontSize: 13,
        fontWeight: FontWeight.w800,
        fontFamily: 'Cairo',
      ),
    );
  }

  Widget _softTextField({
    required TextEditingController controller,
    required String hint,
    required IconData icon,
    TextInputType? keyboardType,
    bool obscureText = false,
    Widget? suffix,
  }) {
    return TextField(
      controller: controller,
      keyboardType: keyboardType,
      obscureText: obscureText,
      textAlign: TextAlign.right,
      style: const TextStyle(
        color: AppColors.textPrimary,
        fontSize: 13,
        fontFamily: 'Cairo',
      ),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(
          color: Color(0xFF9AA1AD),
          fontSize: 12,
          fontFamily: 'Cairo',
        ),
        prefixIcon: Icon(
          icon,
          color: AppColors.textSecondary,
          size: 18,
        ),
        suffixIcon: suffix,
        filled: true,
        fillColor: AppColors.softBackground,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 15,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(24),
          borderSide: const BorderSide(color: AppColors.softBorder, width: 1),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(24),
          borderSide: const BorderSide(
            color: AppColors.warmAccent,
            width: 1.5,
          ),
        ),
      ),
    );
  }

  Widget _googleLoginButton() {
    return GestureDetector(
      onTap: _isGoogleLoading ? null : _handleGoogleLogin,
      child: Container(
        height: 54,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(27),
          border: Border.all(color: const Color(0xFFE2E5EA), width: 1.2),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 18,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (_isGoogleLoading)
              const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2.2,
                  color: AppColors.showroomPurple,
                ),
              )
            else
              _googleMark(),
            const SizedBox(width: 12),
            const Text(
              'تسجيل الدخول باستخدام Google',
              style: TextStyle(
                color: AppColors.textPrimary,
                fontSize: 13,
                fontWeight: FontWeight.w800,
                fontFamily: 'Cairo',
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _googleMark() {
    return Container(
      width: 28,
      height: 28,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: Colors.white,
        shape: BoxShape.circle,
        border: Border.all(color: const Color(0xFFE7E9EF)),
      ),
      child: const Text(
        'G',
        style: TextStyle(
          color: Color(0xFF4285F4),
          fontSize: 17,
          fontWeight: FontWeight.w900,
          fontFamily: 'Arial',
        ),
      ),
    );
  }

  Widget _gradientButton() {
    return GestureDetector(
      onTap: _isLoading ? null : _handleLogin,
      child: Container(
        height: 54,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(27),
          gradient: const LinearGradient(
            colors: [AppColors.warmAccent, AppColors.warmAccentDeep],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
          boxShadow: [
            BoxShadow(
              color: AppColors.warmAccent.withOpacity(0.28),
              blurRadius: 18,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: _isLoading
            ? const SizedBox(
                width: 22,
                height: 22,
                child: CircularProgressIndicator(
                  color: Colors.white,
                  strokeWidth: 2.4,
                ),
              )
            : const Text(
                'تسجيل الدخول',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w800,
                  fontSize: 15,
                  fontFamily: 'Cairo',
                ),
              ),
      ),
    );
  }

  Widget _supportButton({
    required IconData icon,
    required Color iconColor,
    required String label,
    required VoidCallback onTap,
  }) {
    return SizedBox(
      height: 54,
      child: OutlinedButton.icon(
        onPressed: onTap,
        icon: Icon(icon, color: iconColor, size: 18),
        label: Text(
          label,
          style: const TextStyle(
            color: AppColors.textPrimary,
            fontWeight: FontWeight.w800,
            fontSize: 12,
            fontFamily: 'Cairo',
          ),
        ),
        style: OutlinedButton.styleFrom(
          side: const BorderSide(color: AppColors.softBorder),
          backgroundColor: AppColors.softSurface,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(27),
          ),
        ),
      ),
    );
  }

  void _launchSupportUrl(String urlString) async {
    final Uri url = Uri.parse(urlString);
    if (await canLaunchUrl(url)) {
      await launchUrl(url, mode: LaunchMode.externalApplication);
    }
  }
}
