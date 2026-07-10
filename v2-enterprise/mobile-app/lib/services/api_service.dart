import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  // Configurable base URL pointing to the .NET backend API
  // Using localhost or fallback to 10.0.2.2 (Android Emulator standard) or network IP
  static const String defaultBaseUrl = 'http://127.0.0.1:8080/api';

  late final Dio _dio;
  String? _token;

  ApiService({String? baseUrl}) {
    _dio = Dio(BaseOptions(
      baseUrl: baseUrl ?? defaultBaseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ));

    // Request interceptor to automatically inject JWT token if authenticated
    _dio.interceptors
        .add(InterceptorsWrapper(onRequest: (options, handler) async {
      if (_token != null) {
        options.headers['Authorization'] = 'Bearer $_token';
      } else {
        final prefs = await SharedPreferences.getInstance();
        final storedToken = prefs.getString('auth_token');
        if (storedToken != null) {
          _token = storedToken;
          options.headers['Authorization'] = 'Bearer $storedToken';
        }
      }
      return handler.next(options);
    }, onError: (DioException e, handler) {
      // Handle global errors, token expiration, etc.
      return handler.next(e);
    }));
  }

  // Check if user is logged in
  Future<bool> isLoggedIn() async {
    if (_token != null) return true;
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString('auth_token');
    return _token != null;
  }

  // Logout and clear storage
  Future<void> logout() async {
    _token = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
    await prefs.remove('customer_name');
    await prefs.remove('customer_email');
    await prefs.remove('customer_photo_url');
    await prefs.remove('auth_provider');
    // Clear cached data tied to the previous account so the next login
    // never shows another account's (or stale) data before a fresh fetch.
    await prefs.remove('cached_showroom_vehicles');
    await prefs.remove('cached_installments_list');
    await prefs.remove('cached_dashboard_stats');
  }

  // Authenticate via Google Sign-In: sends the Google ID token to the backend
  // for real verification (signature + audience), which returns our own JWT.
  Future<Map<String, dynamic>> loginWithGoogle(String idToken) async {
    try {
      final response = await _dio.post('/customer/auth/google', data: {
        'idToken': idToken,
      });

      if (response.statusCode == 200 && response.data['success'] == true) {
        final data = response.data['data'];
        final token = data['token'];
        final user = data['user'];

        _token = token;
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('auth_token', token);
        await prefs.setString('auth_provider', 'google');
        await prefs.setString('customer_name', user['name'] ?? '');
        await prefs.setString('customer_email', user['email'] ?? '');
        final photoUrl = user['photoUrl'] as String?;
        if (photoUrl != null && photoUrl.isNotEmpty) {
          await prefs.setString('customer_photo_url', photoUrl);
        } else {
          await prefs.remove('customer_photo_url');
        }

        return {
          'success': true,
          'customerName': user['name'],
          'isLinkedToCustomer': user['isLinkedToCustomer'] ?? false,
        };
      }
      return {
        'success': false,
        'message': response.data['message'] ?? 'فشل تسجيل الدخول عبر Google',
      };
    } on DioException catch (e) {
      final msg = e.response?.data?['message'] ?? 'خطأ في الاتصال بالخادم';
      return {
        'success': false,
        'message': msg,
      };
    }
  }

  // Authenticate Customer
  Future<Map<String, dynamic>> login(String phone, String idNumber) async {
    try {
      final response = await _dio.post('/customer/auth/login', data: {
        'phone': phone,
        'password': idNumber, // IdNumber acts as the default password
      });

      if (response.statusCode == 200 && response.data['success'] == true) {
        final data = response.data['data'];
        final token = data['token'];
        final customer = data['customer'];

        _token = token;
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('auth_token', token);
        await prefs.setString('customer_name', customer['name'] ?? '');
        await prefs.remove('customer_email');
        await prefs.remove('customer_photo_url');
        await prefs.setString('auth_provider', 'phone');

        return {
          'success': true,
          'token': token,
          'customerName': customer['name'],
        };
      }
      return {
        'success': false,
        'message': response.data['message'] ?? 'فشل تسجيل الدخول',
      };
    } on DioException catch (e) {
      final msg = e.response?.data?['message'] ?? 'خطأ في الاتصال بالخادم';
      return {
        'success': false,
        'message': msg,
      };
    }
  }

  // Get public vehicles list for Guest Showroom
  Future<List<Map<String, dynamic>>> getPublicShowroom({String? search}) async {
    try {
      final response = await _dio.get('/public/inventory', queryParameters: {
        if (search != null) 'search': search,
      });

      if (response.statusCode == 200 && response.data['success'] == true) {
        final items = response.data['data']['items'] as List;
        return List<Map<String, dynamic>>.from(items);
      }
    } catch (_) {}

    return [];
  }

  // Get active contracts for current customer
  Future<List<Map<String, dynamic>>> getMyContracts() async {
    try {
      final response = await _dio.get('/customer/contracts');
      if (response.statusCode == 200 && response.data['success'] == true) {
        final items = response.data['data'] as List;
        return List<Map<String, dynamic>>.from(items);
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  // Get installments for current customer
  Future<List<Map<String, dynamic>>> getMyInstallments() async {
    try {
      final response = await _dio.get('/customer/installments');
      if (response.statusCode == 200 && response.data['success'] == true) {
        final items = response.data['data'] as List;
        return List<Map<String, dynamic>>.from(items);
      }
    } catch (_) {}

    return [];
  }

  // Get customer dashboard statistics
  Future<Map<String, dynamic>?> getMyDashboard() async {
    try {
      final response = await _dio.get('/customer/dashboard');
      if (response.statusCode == 200 && response.data['success'] == true) {
        return Map<String, dynamic>.from(response.data['data']);
      }
    } catch (_) {}

    return null;
  }

  // Get customer payment transactions history
  Future<List<Map<String, dynamic>>> getMyPayments() async {
    try {
      final response = await _dio.get('/customer/payments');
      if (response.statusCode == 200 && response.data['success'] == true) {
        final items = response.data['data'] as List;
        return List<Map<String, dynamic>>.from(items);
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  // ==========================================
  // MANAGEMENT HUB API PLACEHOLDERS (Employee/Admin operations)
  // These represent backend endpoints that need to be fully implemented.
  // ==========================================

  // Get administrative stats for Management Dashboard (Placeholder for /admin/dashboard)
  Future<Map<String, dynamic>?> getManagementDashboard() async {
    try {
      // Direct call fallback, if route does not exist it catches and logs a warning
      final response = await _dio.get('/admin/dashboard');
      if (response.statusCode == 200 && response.data['success'] == true) {
        return Map<String, dynamic>.from(response.data['data']);
      }
      return null;
    } catch (e) {
      // Documenting missing API endpoint
      print(
          'API WARNING: /admin/dashboard is missing or unauthorized. Using fallback structures.');
      return null;
    }
  }

  // Get customers list (Placeholder for /admin/customers)
  Future<List<Map<String, dynamic>>> getManagementCustomers() async {
    try {
      final response = await _dio.get('/admin/customers');
      if (response.statusCode == 200 && response.data['success'] == true) {
        final items = response.data['data'] as List;
        return List<Map<String, dynamic>>.from(items);
      }
      return [];
    } catch (e) {
      print('API WARNING: /admin/customers is missing or unauthorized.');
      return [];
    }
  }

  // Get sales and purchases transaction ledger (Placeholder for /admin/transactions)
  Future<List<Map<String, dynamic>>> getManagementTransactions(
      {String? type}) async {
    try {
      final response = await _dio.get('/admin/transactions', queryParameters: {
        if (type != null) 'type': type,
      });
      if (response.statusCode == 200 && response.data['success'] == true) {
        final items = response.data['data'] as List;
        return List<Map<String, dynamic>>.from(items);
      }
      return [];
    } catch (e) {
      print('API WARNING: /admin/transactions is missing or unauthorized.');
      return [];
    }
  }

  // Create new vehicle (Placeholder for /admin/inventory/create)
  Future<bool> addVehicle(Map<String, dynamic> vehicleData) async {
    try {
      final response = await _dio.post('/admin/inventory', data: vehicleData);
      return response.statusCode == 200 || response.statusCode == 211;
    } catch (e) {
      print('API WARNING: POST /admin/inventory is missing or unauthorized.');
      return false;
    }
  }

  // Update vehicle details (Placeholder for /admin/inventory/update)
  Future<bool> updateVehicle(int id, Map<String, dynamic> vehicleData) async {
    try {
      final response =
          await _dio.put('/admin/inventory/$id', data: vehicleData);
      return response.statusCode == 200;
    } catch (e) {
      print(
          'API WARNING: PUT /admin/inventory/$id is missing or unauthorized.');
      return false;
    }
  }

  // Reserve vehicle (Placeholder for /admin/inventory/reserve)
  Future<bool> reserveVehicle(int id) async {
    try {
      final response = await _dio.post('/admin/inventory/$id/reserve');
      return response.statusCode == 200;
    } catch (e) {
      print(
          'API WARNING: POST /admin/inventory/$id/reserve is missing or unauthorized.');
      return false;
    }
  }

  // List conversations for the current user (or all conversations if manager)
  Future<List<Map<String, dynamic>>> getConversations() async {
    try {
      final response = await _dio.get('/conversations');
      if (response.statusCode == 200 && response.data['success'] == true) {
        return List<Map<String, dynamic>>.from(response.data['data']);
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  // Get or create a conversation about a specific vehicle, returns conversation id
  Future<String?> startConversation(String vehicleId) async {
    try {
      final response = await _dio.post('/conversations', data: {
        'vehicleId': vehicleId,
      });
      if (response.statusCode == 200 && response.data['success'] == true) {
        return response.data['data']['id'] as String;
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  // Get all messages in a conversation, along with the related vehicle info
  Future<Map<String, dynamic>?> getConversationMessages(
      String conversationId) async {
    try {
      final response = await _dio.get('/conversations/$conversationId/messages');
      if (response.statusCode == 200 && response.data['success'] == true) {
        return response.data['data'] as Map<String, dynamic>;
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  // Send a message within a conversation
  Future<Map<String, dynamic>?> sendMessage(
      String conversationId, String text) async {
    try {
      final response = await _dio.post(
        '/conversations/$conversationId/messages',
        data: {'text': text},
      );
      if (response.statusCode == 200 && response.data['success'] == true) {
        return response.data['data'] as Map<String, dynamic>;
      }
      return null;
    } catch (_) {
      return null;
    }
  }
}
