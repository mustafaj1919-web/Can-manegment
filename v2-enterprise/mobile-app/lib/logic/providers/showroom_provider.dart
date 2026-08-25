import 'package:flutter/material.dart';
import '../../data/repositories/vehicle_repository.dart';

class ShowroomProvider extends ChangeNotifier {
  final VehicleRepository _repository = VehicleRepository();

  List<Map<String, dynamic>> _allCars = [];
  List<Map<String, dynamic>> _filteredCars = [];
  bool _isLoading = false;
  
  // Active Filter state variables
  String _selectedBrand = 'All';
  String _selectedStatus = 'All';
  double? _minPrice;
  double? _maxPrice;
  int? _selectedYear;
  String _searchQuery = '';

  // Getters
  List<Map<String, dynamic>> get allCars => _allCars;
  List<Map<String, dynamic>> get filteredCars => _filteredCars;
  bool get isLoading => _isLoading;
  String get selectedBrand => _selectedBrand;
  String get selectedStatus => _selectedStatus;
  double? get minPrice => _minPrice;
  double? get maxPrice => _maxPrice;
  int? get selectedYear => _selectedYear;
  String get searchQuery => _searchQuery;

  // Initialize and load vehicles
  Future<void> loadVehicles({bool forceRefresh = false}) async {
    _isLoading = true;
    notifyListeners();

    try {
      _allCars = await _repository.getVehicles(forceRefresh: forceRefresh);
      _applyFilters();
    } catch (_) {}

    _isLoading = false;
    notifyListeners();
  }

  // Update brand filter
  void setBrand(String brand) {
    _selectedBrand = brand;
    _applyFilters();
    notifyListeners();
  }

  // Update advanced filters
  void applyAdvancedFilters({
    double? minPrice,
    double? maxPrice,
    int? selectedYear,
    String? selectedStatus,
  }) {
    _minPrice = minPrice;
    _maxPrice = maxPrice;
    _selectedYear = selectedYear;
    if (selectedStatus != null) _selectedStatus = selectedStatus;
    
    _applyFilters();
    notifyListeners();
  }

  // Reset advanced filters
  void resetAdvancedFilters() {
    _minPrice = null;
    _maxPrice = null;
    _selectedYear = null;
    _selectedStatus = 'All';
    
    _applyFilters();
    notifyListeners();
  }

  // Update text search query
  void setSearchQuery(String query) {
    _searchQuery = query;
    _applyFilters();
    notifyListeners();
  }

  // Internal helper to filter cars based on active state variables
  void _applyFilters() {
    List<Map<String, dynamic>> results = List.from(_allCars);

    // 1. Brand filter
    if (_selectedBrand != 'All') {
      results = results.where((c) =>
        (c['brand'] ?? '').toString().toLowerCase() == _selectedBrand.toLowerCase()
      ).toList();
    }

    // 2. Search query filter
    final query = _searchQuery.trim().toLowerCase();
    if (query.isNotEmpty) {
      results = results.where((c) {
        final brand = (c['brand'] ?? '').toString().toLowerCase();
        final model = (c['model'] ?? '').toString().toLowerCase();
        final year = (c['manufacturing_year'] ?? '').toString();
        return brand.contains(query) || model.contains(query) || year.contains(query);
      }).toList();
    }

    // 3. Price range filters
    if (_minPrice != null) {
      results = results.where((c) {
        final price = (c['selling_price'] as num?)?.toDouble() ?? 0.0;
        return price >= _minPrice!;
      }).toList();
    }
    if (_maxPrice != null) {
      results = results.where((c) {
        final price = (c['selling_price'] as num?)?.toDouble() ?? 0.0;
        return price <= _maxPrice!;
      }).toList();
    }

    // 4. Manufacturing Year filter
    if (_selectedYear != null) {
      results = results.where((c) =>
        (c['manufacturing_year'] as num?)?.toInt() == _selectedYear
      ).toList();
    }

    // 5. Status filter
    if (_selectedStatus != 'All') {
      final statusQuery = _selectedStatus.toLowerCase() == 'available' ? 'available' : 'reserved';
      results = results.where((c) {
        final status = (c['status'] ?? '').toString().toLowerCase();
        if (statusQuery == 'available') {
          return status == 'available';
        } else {
          return status != 'available';
        }
      }).toList();
    }

    _filteredCars = results;
  }
}
