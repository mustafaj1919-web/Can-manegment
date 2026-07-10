import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'theme/colors.dart';
import 'screens/welcome_screen.dart';
import 'screens/login_screen.dart';
import 'core/di/service_locator.dart';
import 'logic/providers/showroom_provider.dart';
import 'logic/providers/installments_provider.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await locator.init();
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(
            create: (_) => ShowroomProvider()..loadVehicles()),
        ChangeNotifierProvider(
            create: (_) => InstallmentsProvider()..loadFinancialData()),
      ],
      child: const AlasdeqaApp(),
    ),
  );
}

class AlasdeqaApp extends StatelessWidget {
  const AlasdeqaApp({super.key});

  @override
  Widget build(BuildContext context) {
    // Inject ApiService from our global ServiceLocator
    final apiService = locator.apiService;

    return MaterialApp(
      title: 'شركة الاصدقاء لتجارة السيارات',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        primaryColor: AppColors.warmAccent,
        scaffoldBackgroundColor: AppColors.softBackground,
        colorScheme: ColorScheme.fromSeed(
          seedColor: AppColors.warmAccent,
          primary: AppColors.warmAccent,
          surface: AppColors.softSurface,
        ),
        fontFamily: 'Cairo', // default Arabic Cairo font compatibility
      ),
      home: Builder(builder: (context) {
        return WelcomeScreen(
          onLoginPressed: () {
            Navigator.of(context).push(
              MaterialPageRoute(
                builder: (context) => LoginScreen(apiService: apiService),
              ),
            );
          },
        );
      }),
    );
  }
}
