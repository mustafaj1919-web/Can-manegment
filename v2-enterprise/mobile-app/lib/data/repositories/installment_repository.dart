import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../../services/api_service.dart';
import '../../core/di/service_locator.dart';

class InstallmentRepository {
  final ApiService _apiService = locator.apiService;
  final SharedPreferences _prefs = locator.sharedPreferences;
  
  static const String _installmentsCacheKey = 'cached_installments_list';
  static const String _dashboardStatsCacheKey = 'cached_dashboard_stats';

  Future<List<Map<String, dynamic>>> getInstallments({bool forceRefresh = false}) async {
    if (!forceRefresh) {
      final cachedJson = _prefs.getString(_installmentsCacheKey);
      if (cachedJson != null) {
        try {
          final List decoded = jsonDecode(cachedJson);
          return decoded.cast<Map<String, dynamic>>();
        } catch (_) {}
      }
    }

    final freshData = await _apiService.getMyInstallments();
    if (freshData.isNotEmpty) {
      await _prefs.setString(_installmentsCacheKey, jsonEncode(freshData));
    }
    return freshData;
  }

  Future<Map<String, dynamic>?> getDashboardStats({bool forceRefresh = false}) async {
    if (!forceRefresh) {
      final cachedJson = _prefs.getString(_dashboardStatsCacheKey);
      if (cachedJson != null) {
        try {
          return jsonDecode(cachedJson) as Map<String, dynamic>;
        } catch (_) {}
      }
    }

    final freshData = await _apiService.getMyDashboard();
    if (freshData != null) {
      await _prefs.setString(_dashboardStatsCacheKey, jsonEncode(freshData));
    }
    return freshData;
  }

  Future<void> saveLocalStats(Map<String, dynamic> stats) async {
    await _prefs.setString(_dashboardStatsCacheKey, jsonEncode(stats));
  }

  Future<void> saveLocalInstallments(List<Map<String, dynamic>> list) async {
    await _prefs.setString(_installmentsCacheKey, jsonEncode(list));
  }
}
