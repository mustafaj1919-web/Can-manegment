import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../../services/api_service.dart';
import '../../core/di/service_locator.dart';

class VehicleRepository {
  final ApiService _apiService = locator.apiService;
  final SharedPreferences _prefs = locator.sharedPreferences;
  static const String _cacheKey = 'cached_showroom_vehicles';

  Future<List<Map<String, dynamic>>> getVehicles({bool forceRefresh = false}) async {
    // 1. Try to read from local cache first if not forced to refresh
    if (!forceRefresh) {
      final cachedJson = _prefs.getString(_cacheKey);
      if (cachedJson != null) {
        try {
          final List decoded = jsonDecode(cachedJson);
          return decoded.cast<Map<String, dynamic>>();
        } catch (_) {}
      }
    }

    // 2. Fetch fresh from remote API
    final List<Map<String, dynamic>> freshData = await _apiService.getPublicShowroom();
    
    // 3. Save fresh data to local cache
    if (freshData.isNotEmpty) {
      await _prefs.setString(_cacheKey, jsonEncode(freshData));
    }

    return freshData;
  }
}
