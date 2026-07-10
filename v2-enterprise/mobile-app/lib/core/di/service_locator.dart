import 'package:shared_preferences/shared_preferences.dart';
import '../../services/api_service.dart';

class ServiceLocator {
  static final ServiceLocator _instance = ServiceLocator._internal();
  factory ServiceLocator() => _instance;
  ServiceLocator._internal();

  late final ApiService apiService;
  late final SharedPreferences sharedPreferences;

  Future<void> init() async {
    sharedPreferences = await SharedPreferences.getInstance();
    apiService = ApiService();
  }
}

final locator = ServiceLocator();
