import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:intl/intl.dart';
import '../../theme/colors.dart';
import '../../logic/providers/installments_provider.dart';

class FinancialsTab extends StatelessWidget {
  final dynamic apiService;

  const FinancialsTab({
    super.key,
    required this.apiService,
  });

  String _formatPrice(double value) {
    final formatter = NumberFormat('#,###');
    return formatter.format(value);
  }

  String _getTimelineDateArabic(String? dateStr) {
    if (dateStr == null) return 'قريباً';
    try {
      final date = DateTime.parse(dateStr);
      final months = [
        'كانون الثاني',
        'شباط',
        'آذار',
        'نيسان',
        'أيار',
        'حزيران',
        'تموز',
        'آب',
        'أيلول',
        'تشرين الأول',
        'تشرين الثاني',
        'كانون الأول'
      ];
      return '${date.day} ${months[date.month - 1]}';
    } catch (_) {
      return '';
    }
  }

  Widget _buildWeekDayCircle(String dayName, String dayNum, bool isActive) {
    return Container(
      width: 52,
      margin: const EdgeInsets.symmetric(horizontal: 4),
      child: Column(
        children: [
          Text(
            dayName,
            style: TextStyle(
              color: isActive ? const Color(0xFF1E293B) : Colors.grey.shade400,
              fontSize: 11,
              fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
              fontFamily: 'Cairo',
            ),
          ),
          const SizedBox(height: 6),
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: isActive ? const Color(0xFF1E293B) : Colors.white,
              border: Border.all(
                color: isActive
                    ? const Color(0xFF1E293B)
                    : const Color(0xFFE2E8F0),
                width: 1.5,
              ),
            ),
            alignment: Alignment.center,
            child: Text(
              dayNum,
              style: TextStyle(
                color: isActive ? Colors.white : const Color(0xFF1E293B),
                fontWeight: FontWeight.bold,
                fontSize: 13,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTimelineItem({
    required String dateLabel,
    required Widget card,
    required bool isFirst,
    required bool isLast,
  }) {
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            width: 60,
            alignment: Alignment.topCenter,
            padding: const EdgeInsets.only(top: 24),
            child: Text(
              dateLabel,
              style: TextStyle(
                color: Colors.grey.shade600,
                fontSize: 11,
                fontWeight: FontWeight.bold,
                fontFamily: 'Cairo',
              ),
            ),
          ),
          SizedBox(
            width: 24,
            child: Stack(
              alignment: Alignment.topCenter,
              children: [
                Positioned(
                  top: isFirst ? 30 : 0,
                  bottom: isLast ? 30 : 0,
                  child: Container(
                    width: 2,
                    color: Colors.grey.shade300,
                  ),
                ),
                Positioned(
                  top: 26,
                  child: Container(
                    width: 10,
                    height: 10,
                    decoration: BoxDecoration(
                      color: const Color(0xFF1E293B),
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 2),
                    ),
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(bottom: 16, top: 12),
              child: card,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTimelineCard({
    required BuildContext context,
    required Map<String, dynamic> inst,
    required bool isPaid,
    required bool isOverdue,
    required double amount,
    required InstallmentsProvider provider,
  }) {
    return GestureDetector(
      onTap: isPaid
          ? null
          : () => _showSettlePaymentSheet(context, inst, provider),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xFF1E293B),
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.08),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: isPaid
                    ? const Color(0xFF10B981).withValues(alpha: 0.15)
                    : Colors.white24,
              ),
              child: Icon(
                isPaid ? LucideIcons.circle_check : LucideIcons.credit_card,
                color: isPaid ? const Color(0xFF10B981) : Colors.white,
                size: 18,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    'قسط رقم ${inst['installment_number']}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      fontFamily: 'Cairo',
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    isPaid
                        ? 'تم السداد بنجاح 🎉'
                        : (isOverdue
                            ? 'قسط متأخر ⚠️'
                            : 'بانتظار التسديد (اضغط للدفع)'),
                    style: TextStyle(
                      color: isPaid
                          ? const Color(0xFF10B981)
                          : (isOverdue ? Colors.red.shade400 : Colors.white70),
                      fontSize: 10,
                      fontFamily: 'Cairo',
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _formatPrice(amount),
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 13,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const Text(
                  'د.ع',
                  style: TextStyle(
                    color: Colors.white70,
                    fontSize: 8,
                    fontFamily: 'Cairo',
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDottedTimelineCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.6),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: const Color(0xFF94A3B8).withValues(alpha: 0.5),
          width: 1.5,
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              color: Color(0xFF1E293B),
            ),
            child: const Icon(LucideIcons.plus, color: Colors.white, size: 16),
          ),
          const Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                'دفعة إضافية متوفرة',
                style: TextStyle(
                  color: Color(0xFF1E293B),
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                  fontFamily: 'Cairo',
                ),
              ),
              Text(
                'اضغط لتسجيل قسط إضافي مبكر',
                style: TextStyle(
                  color: Color(0xFF64748B),
                  fontSize: 10,
                  fontFamily: 'Cairo',
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  void _showSettlePaymentSheet(BuildContext context,
      Map<String, dynamic> installment, InstallmentsProvider provider) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return SettlePaymentSheet(
          installment: installment,
          onPaymentSuccess: (number, amount) {
            provider.simulatePaymentSuccess(number, amount);
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<InstallmentsProvider>(
      builder: (context, provider, child) {
        if (provider.isLoading && !provider.isLoaded) {
          return const Center(
              child: CircularProgressIndicator(color: AppColors.primary));
        }

        final installments = provider.installmentsList;

        // Find next unpaid installment
        Map<String, dynamic>? nextUnpaid;
        for (final inst in installments) {
          final status = (inst['status'] ?? '').toString().toLowerCase();
          if (status != 'paid') {
            nextUnpaid = inst;
            break;
          }
        }

        String activeMonthYear = 'أيار 2026';
        if (nextUnpaid != null && nextUnpaid['due_date'] != null) {
          try {
            final date = DateTime.parse(nextUnpaid['due_date']);
            final months = [
              'كانون الثاني',
              'شباط',
              'آذار',
              'نيسان',
              'أيار',
              'حزيران',
              'تموز',
              'آب',
              'أيلول',
              'تشرين الأول',
              'تشرين الثاني',
              'كانون الأول'
            ];
            activeMonthYear = '${months[date.month - 1]} ${date.year}';
          } catch (_) {}
        }

        List<Widget> weekCircles = [];
        try {
          final baseDate = nextUnpaid != null && nextUnpaid['due_date'] != null
              ? DateTime.parse(nextUnpaid['due_date'])
              : DateTime.now();
          final daysOfWeekArabic = [
            'اثنين',
            'ثلاثاء',
            'أربعاء',
            'خميس',
            'جمعة',
            'سبت',
            'أحد'
          ];

          for (int i = -3; i <= 3; i++) {
            final date = baseDate.add(Duration(days: i));
            final dayName = daysOfWeekArabic[date.weekday - 1];
            final dayNum = date.day.toString();
            final isActive = i == 0;
            weekCircles.add(_buildWeekDayCircle(dayName, dayNum, isActive));
          }
        } catch (_) {
          weekCircles = [
            _buildWeekDayCircle('اثنين', '9', false),
            _buildWeekDayCircle('ثلاثاء', '10', false),
            _buildWeekDayCircle('أربعاء', '11', false),
            _buildWeekDayCircle('خميس', '12', true),
            _buildWeekDayCircle('جمعة', '13', false),
            _buildWeekDayCircle('سبت', '14', false),
            _buildWeekDayCircle('أحد', '15', false),
          ];
        }

        return RefreshIndicator(
          onRefresh: () => provider.loadFinancialData(forceRefresh: true),
          color: const Color(0xFF2563EB),
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.only(
                left: 20, right: 20, top: 24, bottom: 120),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Icon(LucideIcons.chevron_left,
                            color: Colors.grey.shade700, size: 22),
                        const SizedBox(width: 16),
                        Icon(LucideIcons.chevron_right,
                            color: Colors.grey.shade700, size: 22),
                      ],
                    ),
                    const Text(
                      'SCHEDULE',
                      style: TextStyle(
                        color: Color(0xFF94A3B8),
                        fontWeight: FontWeight.bold,
                        fontSize: 10,
                        letterSpacing: 1.2,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Align(
                  alignment: Alignment.centerRight,
                  child: Text(
                    activeMonthYear,
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w900,
                      color: Color(0xFF1E293B),
                      fontFamily: 'Cairo',
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                SizedBox(
                  height: 74,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    reverse: true,
                    children: weekCircles,
                  ),
                ),
                const SizedBox(height: 10),
                Container(
                  padding:
                      const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(32),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Align(
                        alignment: Alignment.centerRight,
                        child: Padding(
                          padding: EdgeInsets.symmetric(horizontal: 8),
                          child: Text(
                            'جدول الأقساط والمدفوعات',
                            style: TextStyle(
                              color: Color(0xFF1E293B),
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                              fontFamily: 'Cairo',
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),
                      if (installments.isEmpty)
                        const Center(
                          child: Padding(
                            padding: EdgeInsets.symmetric(vertical: 40),
                            child: Text(
                              'لا توجد أقساط مسجلة على هذا العقد',
                              style: TextStyle(
                                  color: Color(0xFF64748B),
                                  fontFamily: 'Cairo'),
                            ),
                          ),
                        )
                      else
                        ListView.builder(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          itemCount: installments.length + 1,
                          itemBuilder: (context, index) {
                            if (index == installments.length) {
                              return _buildTimelineItem(
                                dateLabel: 'إضافة',
                                card: _buildDottedTimelineCard(),
                                isFirst: index == 0,
                                isLast: true,
                              );
                            }

                            final inst = installments[index];
                            final isPaid = inst['status'] == 'Paid' ||
                                inst['status'] == 'paid';
                            final isOverdue = inst['status'] == 'Overdue' ||
                                inst['status'] == 'overdue';
                            final double instAmount =
                                (inst['amount'] as num?)?.toDouble() ?? 0.0;
                            final String dateLabel =
                                _getTimelineDateArabic(inst['due_date']);

                            return _buildTimelineItem(
                              dateLabel: dateLabel,
                              card: _buildTimelineCard(
                                context: context,
                                inst: inst,
                                isPaid: isPaid,
                                isOverdue: isOverdue,
                                amount: instAmount,
                                provider: provider,
                              ),
                              isFirst: index == 0,
                              isLast: false,
                            );
                          },
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class SettlePaymentSheet extends StatefulWidget {
  final Map<String, dynamic> installment;
  final Function(int installmentNumber, double amount) onPaymentSuccess;

  const SettlePaymentSheet({
    super.key,
    required this.installment,
    required this.onPaymentSuccess,
  });

  @override
  State<SettlePaymentSheet> createState() => _SettlePaymentSheetState();
}

class _SettlePaymentSheetState extends State<SettlePaymentSheet> {
  int _step = 0; // 0: Select payment method, 1: Processing, 2: Success
  String _selectedMethod = 'zain';

  String _formatPrice(double value) {
    final formatter = NumberFormat('#,###');
    return formatter.format(value);
  }

  @override
  Widget build(BuildContext context) {
    final double amount =
        (widget.installment['amount'] as num?)?.toDouble() ?? 0.0;
    final int number = widget.installment['installment_number'] ?? 0;

    return Container(
      padding: EdgeInsets.only(
        top: 24,
        left: 24,
        right: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
      ),
      child: AnimatedSwitcher(
        duration: const Duration(milliseconds: 300),
        child: _buildContent(number, amount),
      ),
    );
  }

  Widget _buildContent(int number, double amount) {
    if (_step == 0) {
      return Column(
        key: const ValueKey(0),
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.shade200,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 20),
          const Text(
            'تسديد قسط شهري',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Color(0xFF1E293B),
              fontFamily: 'Cairo',
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'قسط رقم ($number) المستحق لحساب عقد سيارتك',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 12,
              color: Colors.grey.shade500,
              fontFamily: 'Cairo',
            ),
          ),
          const SizedBox(height: 24),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '${_formatPrice(amount)} د.ع',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF2563EB),
                  ),
                ),
                const Text(
                  'مبلغ القسط الحالي',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF475569),
                    fontFamily: 'Cairo',
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          const Text(
            'اختر طريقة الدفع',
            textAlign: TextAlign.right,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.bold,
              color: Color(0xFF1E293B),
              fontFamily: 'Cairo',
            ),
          ),
          const SizedBox(height: 12),
          _buildMethodTile(
            id: 'zain',
            title: 'زين كاش (Zain Cash)',
            icon: LucideIcons.wallet,
            color: const Color(0xFF84CC16),
          ),
          const SizedBox(height: 10),
          _buildMethodTile(
            id: 'asia',
            title: 'آسيا حوالة (AsiaCell)',
            icon: LucideIcons.smartphone,
            color: const Color(0xFFEF4444),
          ),
          const SizedBox(height: 10),
          _buildMethodTile(
            id: 'master',
            title: 'بطاقة ائتمان (Visa / MasterCard)',
            icon: LucideIcons.credit_card,
            color: const Color(0xFF3B82F6),
          ),
          const SizedBox(height: 32),
          SizedBox(
            height: 54,
            child: ElevatedButton(
              onPressed: () {
                setState(() {
                  _step = 1;
                });
                Future.delayed(const Duration(seconds: 2), () {
                  if (mounted) {
                    setState(() {
                      _step = 2;
                    });
                    widget.onPaymentSuccess(number, amount);
                  }
                });
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF1E293B),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(27),
                ),
                elevation: 0,
              ),
              child: const Text(
                'تأكيد وتسديد الآن',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                  fontFamily: 'Cairo',
                ),
              ),
            ),
          ),
        ],
      );
    } else if (_step == 1) {
      return Column(
        key: const ValueKey(1),
        mainAxisSize: MainAxisSize.min,
        children: [
          const SizedBox(height: 40),
          const SizedBox(
            width: 50,
            height: 50,
            child: CircularProgressIndicator(
              color: Color(0xFF2563EB),
              strokeWidth: 4,
            ),
          ),
          const SizedBox(height: 24),
          const Text(
            'جاري معالجة الدفع الآمن...',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Color(0xFF1E293B),
              fontFamily: 'Cairo',
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'يرجى عدم إغلاق التطبيق أو العودة للخلف',
            style: TextStyle(
              fontSize: 11,
              color: Colors.grey.shade500,
              fontFamily: 'Cairo',
            ),
          ),
          const SizedBox(height: 40),
        ],
      );
    } else {
      return Column(
        key: const ValueKey(2),
        mainAxisSize: MainAxisSize.min,
        children: [
          const SizedBox(height: 24),
          Container(
            width: 72,
            height: 72,
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              color: Color(0xFFDCFCE7),
            ),
            child: const Icon(
              LucideIcons.check,
              color: Color(0xFF15803D),
              size: 40,
            ),
          ),
          const SizedBox(height: 24),
          const Text(
            'تم تسديد القسط بنجاح! 🎉',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w900,
              color: Color(0xFF15803D),
              fontFamily: 'Cairo',
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'شكراً لك! تم تحديث سجل حسابك المالي فوراً 💸',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 12,
              color: Colors.grey.shade600,
              fontFamily: 'Cairo',
            ),
          ),
          const SizedBox(height: 32),
          SizedBox(
            width: double.infinity,
            height: 52,
            child: ElevatedButton(
              onPressed: () {
                Navigator.pop(context);
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF15803D),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(26),
                ),
                elevation: 0,
              ),
              child: const Text(
                'تم',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                  fontFamily: 'Cairo',
                ),
              ),
            ),
          ),
        ],
      );
    }
  }

  Widget _buildMethodTile({
    required String id,
    required String title,
    required IconData icon,
    required Color color,
  }) {
    final isSelected = _selectedMethod == id;
    return GestureDetector(
      onTap: () {
        setState(() {
          _selectedMethod = id;
        });
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFFF1F5F9) : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color:
                isSelected ? const Color(0xFF1E293B) : const Color(0xFFE2E8F0),
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: color, size: 18),
            ),
            const SizedBox(width: 12),
            Text(
              title,
              style: TextStyle(
                fontSize: 12,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                color: isSelected
                    ? const Color(0xFF1E293B)
                    : const Color(0xFF475569),
                fontFamily: 'Cairo',
              ),
            ),
            const Spacer(),
            Icon(
              isSelected
                  ? Icons.radio_button_checked_rounded
                  : Icons.radio_button_off_rounded,
              color:
                  isSelected ? const Color(0xFF1E293B) : Colors.grey.shade400,
              size: 20,
            ),
          ],
        ),
      ),
    );
  }
}
