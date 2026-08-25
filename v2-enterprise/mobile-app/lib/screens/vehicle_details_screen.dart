import 'package:flutter/material.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:intl/intl.dart';
import '../theme/colors.dart';
import '../services/api_service.dart';
import 'conversation_screen.dart';

class VehicleDetailsScreen extends StatefulWidget {
  final Map<String, dynamic> car;
  final ApiService apiService;
  final bool isManager;
  final VoidCallback? onRefreshCatalog;

  const VehicleDetailsScreen({
    super.key,
    required this.car,
    required this.apiService,
    required this.isManager,
    this.onRefreshCatalog,
  });

  @override
  State<VehicleDetailsScreen> createState() => _VehicleDetailsScreenState();
}

class _VehicleDetailsScreenState extends State<VehicleDetailsScreen> {
  late Map<String, dynamic> _car;
  bool _isReserving = false;
  bool _isStartingConversation = false;
  bool _isFavorite = false;
  int _selectedTab = 0; // 0: التفاصيل, 1: الميزات, 2: التصميم, 3: تفاصيل الحادث
  int _selectedImageIndex = 0;

  @override
  void initState() {
    super.initState();
    _car = Map<String, dynamic>.from(widget.car);
  }

  String _formatPrice(dynamic price) {
    if (price == null) return '\$ 23,150';
    final double numVal = (price as num).toDouble();
    final formatter = NumberFormat('#,###');
    return '\$ ${formatter.format(numVal)}';
  }

  String _getCarAsset(String model, String brand) {
    final modelLower = model.toLowerCase();
    final brandLower = brand.toLowerCase();
    if (modelLower.contains('mercedes') ||
        brandLower.contains('mercedes') ||
        modelLower.contains('benz') ||
        modelLower.contains('gle')) {
      return 'assets/images/mercedes.png';
    } else if (modelLower.contains('patrol') ||
        modelLower.contains('rover') ||
        brandLower.contains('lexus') ||
        modelLower.contains('cruiser') ||
        brandLower.contains('land cruiser') ||
        modelLower.contains('lx570')) {
      return 'assets/images/range_rover.png';
    } else {
      return 'assets/images/tesla.png';
    }
  }

  void _handleReserve() async {
    setState(() => _isReserving = true);
    final success = await widget.apiService.reserveVehicle(_car['id'] ?? 0);
    setState(() => _isReserving = false);

    if (success) {
      setState(() {
        _car['status'] = 'Reserved';
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('تم حجز السيارة بنجاح عبر الشركة',
              textAlign: TextAlign.right),
          backgroundColor: AppColors.cyanButton,
        ),
      );
      if (widget.onRefreshCatalog != null) {
        widget.onRefreshCatalog!();
      }
    } else {
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          backgroundColor: AppColors.darkCard,
          title: const Text('طلب الشراء والحجز',
              textAlign: TextAlign.right,
              style: TextStyle(color: Colors.white, fontFamily: 'Cairo')),
          content: const Text(
            'تم تسجيل طلب الحجز الخاص بك لـ سيارتك وسيتم تواصل قسم المبيعات معك لتأكيد العقد.',
            textAlign: TextAlign.right,
            style: TextStyle(color: Colors.white70, fontFamily: 'Cairo'),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('حسناً',
                  style: TextStyle(
                      color: AppColors.cyanAccent, fontFamily: 'Cairo')),
            ),
          ],
        ),
      );
    }
  }

  Future<void> _openConversation(String brand, String model) async {
    if (_isStartingConversation) return;
    setState(() => _isStartingConversation = true);

    final vehicleId = (_car['id'] ?? '').toString();
    final conversationId = await widget.apiService.startConversation(vehicleId);

    if (!mounted) return;
    setState(() => _isStartingConversation = false);

    if (conversationId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('تعذر بدء المحادثة، يرجى المحاولة لاحقاً',
              textAlign: TextAlign.right),
          backgroundColor: AppColors.danger,
        ),
      );
      return;
    }

    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => ConversationScreen(
          conversationId: conversationId,
          vehicleTitle: '$brand $model',
          isManager: widget.isManager,
          apiService: widget.apiService,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final String brand = _car['brand'] ?? 'BMW';
    final String model = _car['model'] ?? 'BMW C550';
    final double price = (_car['selling_price'] as num?)?.toDouble() ?? 23150;
    final int mileage = _car['mileage'] ?? 1032;
    final String carAsset = _getCarAsset(model, brand);

    final List<String> thumbnails = [
      carAsset,
      'assets/images/mercedes.png',
      'assets/images/range_rover.png',
      'assets/images/tesla.png',
    ];

    return Scaffold(
      backgroundColor: AppColors.darkBackground,
      body: SafeArea(
        child: Column(
          children: [
            // Top Navigation Bar (Back, Title, Share/Heart)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  // Left side: Share & Heart Icons
                  Row(
                    children: [
                      GestureDetector(
                        onTap: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                                content: Text('تم مشاركة رابط السيارة',
                                    textAlign: TextAlign.right)),
                          );
                        },
                        child: Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: AppColors.darkCard,
                            shape: BoxShape.circle,
                            border: Border.all(color: AppColors.darkCardBorder),
                          ),
                          child: const Icon(LucideIcons.share_2,
                              color: Colors.white, size: 18),
                        ),
                      ),
                      const SizedBox(width: 10),
                      GestureDetector(
                        onTap: () {
                          setState(() {
                            _isFavorite = !_isFavorite;
                          });
                        },
                        child: Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: AppColors.darkCard,
                            shape: BoxShape.circle,
                            border: Border.all(color: AppColors.darkCardBorder),
                          ),
                          child: Icon(
                            _isFavorite
                                ? Icons.favorite_rounded
                                : LucideIcons.heart,
                            color:
                                _isFavorite ? Colors.redAccent : Colors.white,
                            size: 18,
                          ),
                        ),
                      ),
                    ],
                  ),

                  // Center: Car Model Title
                  Text(
                    model.isNotEmpty ? model : brand,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      fontFamily: 'Cairo',
                    ),
                  ),

                  // Right side: Back Chevron
                  GestureDetector(
                    onTap: () => Navigator.pop(context),
                    child: Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: AppColors.darkCard,
                        shape: BoxShape.circle,
                        border: Border.all(color: AppColors.darkCardBorder),
                      ),
                      child: const Icon(LucideIcons.chevron_right,
                          color: Colors.white, size: 18),
                    ),
                  ),
                ],
              ),
            ),

            // Scrollable Content
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Column(
                  children: [
                    const SizedBox(height: 10),
                    // Hero Car Image Stage with Subtle Glow
                    SizedBox(
                      height: 180,
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          Container(
                            width: 200,
                            height: 100,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              boxShadow: [
                                BoxShadow(
                                  color: AppColors.cyanAccent
                                      .withValues(alpha: 0.15),
                                  blurRadius: 50,
                                  spreadRadius: 20,
                                )
                              ],
                            ),
                          ),
                          Hero(
                            tag: 'car-${_car['id']}',
                            child: Image.asset(
                              thumbnails[
                                  _selectedImageIndex % thumbnails.length],
                              fit: BoxFit.contain,
                              height: 170,
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 16),

                    // Horizontal Thumbnail Selector Row
                    SizedBox(
                      height: 54,
                      child: ListView.builder(
                        scrollDirection: Axis.horizontal,
                        itemCount: thumbnails.length,
                        itemBuilder: (context, idx) {
                          final isSelected = _selectedImageIndex == idx;
                          return GestureDetector(
                            onTap: () =>
                                setState(() => _selectedImageIndex = idx),
                            child: Container(
                              width: 68,
                              margin: const EdgeInsets.symmetric(horizontal: 4),
                              padding: const EdgeInsets.all(4),
                              decoration: BoxDecoration(
                                color: AppColors.darkCard,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: isSelected
                                      ? AppColors.cyanAccent
                                      : AppColors.darkCardBorder,
                                  width: isSelected ? 2 : 1,
                                ),
                              ),
                              child: Image.asset(thumbnails[idx],
                                  fit: BoxFit.contain),
                            ),
                          );
                        },
                      ),
                    ),

                    const SizedBox(height: 24),

                    // 3 Spec Metric Cards (عداد السرعة | نوع القير | سعة المحرك)
                    Row(
                      children: [
                        // Card 1: Engine Capacity
                        Expanded(
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            decoration: BoxDecoration(
                              color: AppColors.darkCard,
                              borderRadius: BorderRadius.circular(18),
                              border:
                                  Border.all(color: AppColors.darkCardBorder),
                            ),
                            child: Column(
                              children: [
                                Icon(LucideIcons.zap,
                                    color: Colors.grey.shade400, size: 20),
                                const SizedBox(height: 6),
                                const Text(
                                  '2.4',
                                  style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 13,
                                      fontWeight: FontWeight.bold),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  'سعة المحرك',
                                  style: TextStyle(
                                      color: Colors.grey.shade400,
                                      fontSize: 10,
                                      fontFamily: 'Cairo'),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        // Card 2: Transmission
                        Expanded(
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            decoration: BoxDecoration(
                              color: AppColors.darkCard,
                              borderRadius: BorderRadius.circular(18),
                              border:
                                  Border.all(color: AppColors.darkCardBorder),
                            ),
                            child: Column(
                              children: [
                                Icon(LucideIcons.settings_2,
                                    color: Colors.grey.shade400, size: 20),
                                const SizedBox(height: 6),
                                const Text(
                                  'اوتوماتيك',
                                  style: TextStyle(
                                      color: AppColors.cyanAccent,
                                      fontSize: 13,
                                      fontWeight: FontWeight.bold,
                                      fontFamily: 'Cairo'),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  'نوع القير',
                                  style: TextStyle(
                                      color: Colors.grey.shade400,
                                      fontSize: 10,
                                      fontFamily: 'Cairo'),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        // Card 3: Odometer
                        Expanded(
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            decoration: BoxDecoration(
                              color: AppColors.darkCard,
                              borderRadius: BorderRadius.circular(18),
                              border:
                                  Border.all(color: AppColors.darkCardBorder),
                            ),
                            child: Column(
                              children: [
                                Icon(LucideIcons.gauge,
                                    color: Colors.grey.shade400, size: 20),
                                const SizedBox(height: 6),
                                Text(
                                  '$mileage كم',
                                  style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 13,
                                      fontWeight: FontWeight.bold,
                                      fontFamily: 'Cairo'),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  'عداد السرعة',
                                  style: TextStyle(
                                      color: Colors.grey.shade400,
                                      fontSize: 10,
                                      fontFamily: 'Cairo'),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 24),

                    // Details Sub-Tabs Bar (التفاصيل | الميزات | التصميم | تفاصيل الحادث)
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        _buildSubTabItem(3, 'تفاصيل الحادث'),
                        _buildSubTabItem(2, 'التصميم'),
                        _buildSubTabItem(1, 'الميزات'),
                        _buildSubTabItem(0, 'التفاصيل'),
                      ],
                    ),

                    const SizedBox(height: 16),

                    // Tab Content Text
                    Align(
                      alignment: Alignment.centerRight,
                      child: Text(
                        'تعتبر هذه السيارة من أبرز إبداعات الصانع الفاخر في عالم السيارات المتقدمة. تمتاز بمواصفات تقنية عالية، محرك رياضي قوي، مع مقصورة داخلية مجهزة بالكامل بأحدث أنظمة الأمان والراحة لقيادة يومية استثنائية.',
                        textAlign: TextAlign.right,
                        style: TextStyle(
                          color: Colors.grey.shade400,
                          fontSize: 12,
                          height: 1.6,
                          fontFamily: 'Cairo',
                        ),
                      ),
                    ),
                    const SizedBox(height: 30),
                  ],
                ),
              ),
            ),

            // Bottom Fixed Action Bar: Price Container (Left) & Cyan Buy Button (Right)
            Container(
              padding: const EdgeInsets.all(20),
              decoration: const BoxDecoration(
                color: AppColors.darkCard,
                borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
                border:
                    Border(top: BorderSide(color: AppColors.darkCardBorder)),
              ),
              child: Row(
                children: [
                  // Left side: Price Container
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        _formatPrice(price),
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      const Text(
                        'السعر الإجمالي الكلي',
                        style: TextStyle(
                            color: Colors.grey,
                            fontSize: 10,
                            fontFamily: 'Cairo'),
                      ),
                    ],
                  ),

                  const Spacer(),

                  // Message the admin about this specific car
                  GestureDetector(
                    onTap: _isStartingConversation
                        ? null
                        : () => _openConversation(brand, model),
                    child: Container(
                      width: 52,
                      height: 52,
                      margin: const EdgeInsets.only(left: 10),
                      decoration: BoxDecoration(
                        color: AppColors.darkBackground,
                        shape: BoxShape.circle,
                        border: Border.all(color: AppColors.darkCardBorder),
                      ),
                      child: _isStartingConversation
                          ? const Padding(
                              padding: EdgeInsets.all(15),
                              child: CircularProgressIndicator(
                                color: AppColors.cyanAccent,
                                strokeWidth: 2,
                              ),
                            )
                          : const Icon(
                              LucideIcons.message_circle,
                              color: AppColors.cyanAccent,
                              size: 22,
                            ),
                    ),
                  ),

                  // Right side: Cyan Buy / Reserve Button (شراء)
                  SizedBox(
                    height: 52,
                    width: 160,
                    child: ElevatedButton(
                      onPressed: _isReserving ? null : _handleReserve,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.cyanButton,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(26),
                        ),
                        elevation: 4,
                      ),
                      child: _isReserving
                          ? const CircularProgressIndicator(color: Colors.white)
                          : const Text(
                              'شراء',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                fontFamily: 'Cairo',
                              ),
                            ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSubTabItem(int index, String title) {
    final isSelected = _selectedTab == index;
    return GestureDetector(
      onTap: () => setState(() => _selectedTab = index),
      child: Column(
        children: [
          Text(
            title,
            style: TextStyle(
              color: isSelected ? AppColors.cyanAccent : Colors.grey.shade400,
              fontSize: 13,
              fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
              fontFamily: 'Cairo',
            ),
          ),
          const SizedBox(height: 6),
          Container(
            height: 2,
            width: 40,
            color: isSelected ? AppColors.cyanAccent : Colors.transparent,
          ),
        ],
      ),
    );
  }
}
