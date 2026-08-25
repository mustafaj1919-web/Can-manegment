import 'package:flutter/material.dart';
import '../../data/repositories/installment_repository.dart';

class InstallmentsProvider extends ChangeNotifier {
  final InstallmentRepository _repository = InstallmentRepository();

  Map<String, dynamic>? _dashboardStats;
  List<Map<String, dynamic>> _installmentsList = [];
  bool _isLoading = false;
  bool _isLoaded = false;

  // Getters
  Map<String, dynamic>? get dashboardStats => _dashboardStats;
  List<Map<String, dynamic>> get installmentsList => _installmentsList;
  bool get isLoading => _isLoading;
  bool get isLoaded => _isLoaded;

  // Load finance data offline-first
  Future<void> loadFinancialData({bool forceRefresh = false}) async {
    _isLoading = true;
    notifyListeners();

    try {
      _dashboardStats = await _repository.getDashboardStats(forceRefresh: forceRefresh);
      _installmentsList = await _repository.getInstallments(forceRefresh: forceRefresh);
      _isLoaded = true;
    } catch (_) {}

    _isLoading = false;
    notifyListeners();
  }

  // Simulate payment processing locally
  Future<void> simulatePaymentSuccess(int installmentNumber, double amount) async {
    if (_dashboardStats == null || _installmentsList.isEmpty) return;

    // 1. Mark installment status as Paid
    for (var inst in _installmentsList) {
      if (inst['installment_number'] == installmentNumber) {
        inst['status'] = 'Paid';
      }
    }

    // 2. Adjust stats metrics
    final double totalPaid = (_dashboardStats!['total_paid'] as num?)?.toDouble() ?? 0.0;
    final double totalRemaining = (_dashboardStats!['total_remaining'] as num?)?.toDouble() ?? 0.0;
    final double nextDue = (_dashboardStats!['next_due_amount'] as num?)?.toDouble() ?? 0.0;

    _dashboardStats!['total_paid'] = totalPaid + amount;
    _dashboardStats!['total_remaining'] = (totalRemaining - amount).clamp(0.0, double.infinity);
    
    if (nextDue == amount) {
      _dashboardStats!['next_due_amount'] = 0.0;
    }

    // 3. Save modified lists locally to persist state
    await _repository.saveLocalStats(_dashboardStats!);
    await _repository.saveLocalInstallments(_installmentsList);

    notifyListeners();
  }
}
