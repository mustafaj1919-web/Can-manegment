import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../logic/providers/showroom_provider.dart';
import '../../theme/colors.dart';
import '../vehicle_details_screen.dart';

class ShowroomTab extends StatefulWidget {
  final bool isManager;
  final String customerName;
  final String? customerEmail;
  final String? customerPhotoUrl;
  final dynamic apiService;

  const ShowroomTab({
    super.key,
    required this.isManager,
    required this.customerName,
    this.customerEmail,
    this.customerPhotoUrl,
    required this.apiService,
  });

  @override
  State<ShowroomTab> createState() => _ShowroomTabState();
}

class _ShowroomTabState extends State<ShowroomTab> {
  final Set<String> _favorites = {};

  String _formatPrice(dynamic price) {
    if (price == null) return '\$ 23,150';
    final value = (price as num).toDouble();
    return '\$ ${NumberFormat('#,###').format(value)}';
  }

  String _carAsset(String model, String brand) {
    final modelLower = model.toLowerCase();
    final brandLower = brand.toLowerCase();
    if (modelLower.contains('mercedes') ||
        brandLower.contains('mercedes') ||
        modelLower.contains('benz') ||
        modelLower.contains('gle')) {
      return 'assets/images/mercedes.png';
    }
    if (modelLower.contains('patrol') ||
        modelLower.contains('rover') ||
        brandLower.contains('lexus') ||
        modelLower.contains('cruiser') ||
        brandLower.contains('land cruiser') ||
        brandLower.contains('toyota') ||
        modelLower.contains('camry')) {
      return 'assets/images/range_rover.png';
    }
    return 'assets/images/tesla.png';
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<ShowroomProvider>(
      builder: (context, provider, child) {
        return Directionality(
          textDirection: ui.TextDirection.rtl,
          child: Container(
            color: AppColors.luxBg,
            child: RefreshIndicator(
              color: AppColors.luxAccent,
              backgroundColor: AppColors.luxCard,
              onRefresh: () => provider.loadVehicles(forceRefresh: true),
              child: provider.isLoading && provider.allCars.isEmpty
                  ? const Center(
                      child: CircularProgressIndicator(
                        color: AppColors.luxAccent,
                      ),
                    )
                  : SingleChildScrollView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.only(bottom: 112),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          _greetingHeader(context, provider),
                          const SizedBox(height: 20),
                          _sectionHeader(provider),
                          const SizedBox(height: 12),
                          _carList(context, provider),
                        ],
                      ),
                    ),
            ),
          ),
        );
      },
    );
  }

  Widget _greetingHeader(BuildContext context, ShowroomProvider provider) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 54, 20, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              _accountAvatar(),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'مرحباً، ${widget.customerName}!',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppColors.luxText,
                        fontSize: 18,
                        fontWeight: FontWeight.w900,
                        fontFamily: 'Cairo',
                      ),
                    ),
                    const SizedBox(height: 3),
                    const Text(
                      'اختر سيارتك المثالية',
                      style: TextStyle(
                        color: AppColors.luxTextMuted,
                        fontSize: 12,
                        fontFamily: 'Cairo',
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 10),
              _locationChip(),
            ],
          ),
          const SizedBox(height: 20),
          _searchBar(context, provider),
          const SizedBox(height: 16),
          _brandSelector(context, provider),
        ],
      ),
    );
  }

  Widget _locationChip() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.luxCard,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.luxBorder),
      ),
      child: const Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(LucideIcons.map_pin, color: AppColors.luxAccent, size: 14),
          SizedBox(width: 4),
          Text(
            'بغداد',
            style: TextStyle(
              color: AppColors.luxText,
              fontSize: 11,
              fontWeight: FontWeight.w800,
              fontFamily: 'Cairo',
            ),
          ),
        ],
      ),
    );
  }

  Widget _accountAvatar() {
    final provider =
        widget.customerPhotoUrl == null || widget.customerPhotoUrl!.isEmpty
            ? const AssetImage('assets/images/app_logo.png') as ImageProvider
            : NetworkImage(widget.customerPhotoUrl!);

    return Container(
      width: 50,
      height: 50,
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(
        color: AppColors.luxCard,
        shape: BoxShape.circle,
        border: Border.all(color: AppColors.luxBorder),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.3),
            blurRadius: 14,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: CircleAvatar(
        backgroundColor: AppColors.luxCardAlt,
        backgroundImage: provider,
      ),
    );
  }

  Widget _roundButton({
    required IconData icon,
    required VoidCallback onTap,
    double size = 44,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: AppColors.luxCard,
          shape: BoxShape.circle,
          border: Border.all(color: AppColors.luxBorder),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.28),
              blurRadius: 14,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Icon(icon, color: AppColors.luxText, size: 20),
      ),
    );
  }

  Widget _searchBar(BuildContext context, ShowroomProvider provider) {
    return Container(
      height: 52,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: AppColors.luxCard,
        borderRadius: BorderRadius.circular(26),
        border: Border.all(color: AppColors.luxBorder),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.25),
            blurRadius: 14,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Row(
        children: [
          const Icon(
            LucideIcons.search,
            color: AppColors.luxTextMuted,
            size: 20,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: TextField(
              onChanged: provider.setSearchQuery,
              textAlign: TextAlign.right,
              style: const TextStyle(
                color: AppColors.luxText,
                fontSize: 13,
                fontFamily: 'Cairo',
              ),
              decoration: const InputDecoration(
                hintText: 'ابحث عن موديل أو سنة',
                hintStyle: TextStyle(
                  color: AppColors.luxTextMuted,
                  fontSize: 13,
                  fontFamily: 'Cairo',
                ),
                border: InputBorder.none,
                isDense: true,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _brandSelector(BuildContext context, ShowroomProvider provider) {
    final brands = [
      {'name': 'الكل', 'id': 'All', 'icon': ''},
      {'name': 'تويوتا', 'id': 'Toyota', 'icon': 'assets/images/toyota.svg'},
      {'name': 'كيا', 'id': 'Kia', 'icon': 'assets/images/kia.svg'},
      {'name': 'هيونداي', 'id': 'Hyundai', 'icon': 'assets/images/hyundai.svg'},
      {'name': 'BMW', 'id': 'BMW', 'icon': 'assets/images/bmw.svg'},
      {
        'name': 'مرسيدس',
        'id': 'Mercedes',
        'icon': 'assets/images/mercedes.svg',
      },
      {'name': 'BYD', 'id': 'BYD', 'icon': 'assets/images/byd.svg'},
    ];

    return SizedBox(
      height: 44,
      child: Row(
        children: [
          _roundButton(
            icon: LucideIcons.sliders_horizontal,
            size: 44,
            onTap: () => _showFilterBottomSheet(context, provider),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              clipBehavior: Clip.none,
              itemCount: brands.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (context, index) {
                final brand = brands[index];
                final brandName = brand['name']!;
                final brandId = brand['id']!;
                final iconPath = brand['icon']!;
                final selected = provider.selectedBrand.toLowerCase() ==
                    brandId.toLowerCase();

                return GestureDetector(
                  onTap: () => provider.setBrand(brandId),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 180),
                    height: 44,
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                    decoration: BoxDecoration(
                      color: selected
                          ? AppColors.luxAccentSoft
                          : AppColors.luxCard,
                      borderRadius: BorderRadius.circular(22),
                      border: Border.all(
                        color: selected
                            ? AppColors.luxAccent
                            : AppColors.luxBorder,
                        width: selected ? 1.4 : 1,
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        iconPath.isEmpty
                            ? Icon(
                                LucideIcons.layout_grid,
                                color: selected
                                    ? AppColors.luxAccent
                                    : AppColors.luxTextMuted,
                                size: 16,
                              )
                            : SizedBox(
                                width: 16,
                                height: 16,
                                child: SvgPicture.asset(
                                  iconPath,
                                  colorFilter: ColorFilter.mode(
                                    selected
                                        ? AppColors.luxAccent
                                        : AppColors.luxText,
                                    BlendMode.srcIn,
                                  ),
                                ),
                              ),
                        const SizedBox(width: 7),
                        Text(
                          brandName,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: selected
                                ? AppColors.luxText
                                : AppColors.luxTextMuted,
                            fontSize: 12,
                            fontWeight:
                                selected ? FontWeight.w800 : FontWeight.w500,
                            fontFamily: 'Cairo',
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _sectionHeader(ShowroomProvider provider) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Row(
        children: [
          const Text(
            'المركبات المتوفرة',
            style: TextStyle(
              color: AppColors.luxText,
              fontSize: 18,
              fontWeight: FontWeight.w900,
              fontFamily: 'Cairo',
            ),
          ),
          const Spacer(),
          Text(
            '${provider.filteredCars.length} سيارة',
            style: const TextStyle(
              color: AppColors.luxTextMuted,
              fontSize: 12,
              fontFamily: 'Cairo',
            ),
          ),
        ],
      ),
    );
  }

  Widget _carList(BuildContext context, ShowroomProvider provider) {
    final list = provider.filteredCars;

    if (list.isEmpty) {
      return Container(
        height: 260,
        margin: const EdgeInsets.symmetric(horizontal: 20),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: AppColors.luxCard,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: AppColors.luxBorder),
        ),
        child: const Text(
          'لا توجد سيارات متوافقة حالياً لدى الشركة',
          style: TextStyle(
            color: AppColors.luxTextMuted,
            fontFamily: 'Cairo',
          ),
        ),
      );
    }

    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 20),
      itemCount: list.length,
      itemBuilder: (context, index) =>
          _carCard(context, provider, list[index], index),
    );
  }

  Widget _carCard(
    BuildContext context,
    ShowroomProvider provider,
    Map<String, dynamic> car,
    int index,
  ) {
    final brand = (car['brand'] ?? 'سيارة').toString();
    final model = (car['model'] ?? 'موديل').toString();
    final price = (car['selling_price'] as num?)?.toDouble() ?? 23150;
    final image = _carAsset(model, brand);
    final carId = (car['id'] ?? '$brand-$model-$index').toString();
    final heroTag = 'car-$carId';
    final isFavorite = _favorites.contains(carId);

    void openDetails() {
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (context) => VehicleDetailsScreen(
            car: car,
            apiService: widget.apiService,
            isManager: widget.isManager,
            onRefreshCatalog: () => provider.loadVehicles(forceRefresh: true),
          ),
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: GestureDetector(
        onTap: openDetails,
        child: ClipRRect(
          borderRadius: BorderRadius.circular(28),
          child: SizedBox(
            height: 250,
            child: Stack(
              fit: StackFit.expand,
              children: [
                Hero(
                  tag: heroTag,
                  child: Image.asset(image, fit: BoxFit.cover),
                ),
                DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      stops: const [0.35, 1.0],
                      colors: [
                        Colors.transparent,
                        Colors.black.withValues(alpha: 0.78),
                      ],
                    ),
                  ),
                ),
                Positioned(
                  top: 14,
                  right: 14,
                  child: GestureDetector(
                    onTap: () {
                      setState(() {
                        if (isFavorite) {
                          _favorites.remove(carId);
                        } else {
                          _favorites.add(carId);
                        }
                      });
                    },
                    child: Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.35),
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: Colors.white.withValues(alpha: 0.18),
                        ),
                      ),
                      child: Icon(
                        LucideIcons.heart,
                        color: isFavorite ? AppColors.luxAccent : Colors.white,
                        size: 18,
                      ),
                    ),
                  ),
                ),
                Positioned(
                  left: 20,
                  right: 20,
                  bottom: 18,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '$brand $model',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.w900,
                          fontFamily: 'Cairo',
                        ),
                      ),
                      const SizedBox(height: 4),
                      Directionality(
                        textDirection: ui.TextDirection.ltr,
                        child: Text(
                          _formatPrice(price),
                          style: const TextStyle(
                            color: AppColors.luxAccent,
                            fontSize: 20,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _showFilterBottomSheet(BuildContext context, ShowroomProvider provider) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (BuildContext context) {
        double? localMin = provider.minPrice;
        double? localMax = provider.maxPrice;
        String localStatus = provider.selectedStatus;

        return Directionality(
          textDirection: ui.TextDirection.rtl,
          child: StatefulBuilder(
            builder: (BuildContext context, StateSetter setModalState) {
              bool selectedPrice(double? min, double? max) {
                return localMin == min && localMax == max;
              }

              Widget chip(String text, bool selected, VoidCallback onTap) {
                return GestureDetector(
                  onTap: onTap,
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 160),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 9,
                    ),
                    decoration: BoxDecoration(
                      color: selected
                          ? AppColors.luxAccentSoft
                          : AppColors.luxCard,
                      borderRadius: BorderRadius.circular(22),
                      border: Border.all(
                        color: selected
                            ? AppColors.luxAccent
                            : AppColors.luxBorder,
                        width: selected ? 1.4 : 1,
                      ),
                    ),
                    child: Text(
                      text,
                      style: TextStyle(
                        color: selected
                            ? AppColors.luxAccent
                            : AppColors.luxTextMuted,
                        fontSize: 11,
                        fontWeight:
                            selected ? FontWeight.w900 : FontWeight.w600,
                        fontFamily: 'Cairo',
                      ),
                    ),
                  ),
                );
              }

              return Container(
                decoration: const BoxDecoration(
                  color: AppColors.luxBg,
                  border: Border(
                    top: BorderSide(color: AppColors.luxBorder),
                    left: BorderSide(color: AppColors.luxBorder),
                    right: BorderSide(color: AppColors.luxBorder),
                  ),
                  borderRadius: BorderRadius.only(
                    topLeft: Radius.circular(30),
                    topRight: Radius.circular(30),
                  ),
                ),
                padding: const EdgeInsets.fromLTRB(24, 16, 24, 32),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Center(
                      child: Container(
                        width: 42,
                        height: 5,
                        decoration: BoxDecoration(
                          color: AppColors.luxBorder,
                          borderRadius: BorderRadius.circular(3),
                        ),
                      ),
                    ),
                    const SizedBox(height: 22),
                    Row(
                      children: [
                        const Text(
                          'الفلاتر',
                          style: TextStyle(
                            color: AppColors.luxText,
                            fontSize: 19,
                            fontWeight: FontWeight.w900,
                            fontFamily: 'Cairo',
                          ),
                        ),
                        const Spacer(),
                        GestureDetector(
                          onTap: () {
                            setModalState(() {
                              localMin = null;
                              localMax = null;
                              localStatus = 'All';
                            });
                          },
                          child: const Text(
                            'إعادة تعيين',
                            style: TextStyle(
                              color: AppColors.luxAccent,
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                              fontFamily: 'Cairo',
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 22),
                    const Text(
                      'نطاق السعر',
                      style: TextStyle(
                        color: AppColors.luxText,
                        fontSize: 13,
                        fontWeight: FontWeight.w900,
                        fontFamily: 'Cairo',
                      ),
                    ),
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        chip('الكل', localMin == null && localMax == null, () {
                          setModalState(() {
                            localMin = null;
                            localMax = null;
                          });
                        }),
                        chip('أقل من \$ 30,000', selectedPrice(null, 30000),
                            () {
                          setModalState(() {
                            localMin = null;
                            localMax = 30000;
                          });
                        }),
                        chip('\$ 30,000 - \$ 70,000',
                            selectedPrice(30000, 70000), () {
                          setModalState(() {
                            localMin = 30000;
                            localMax = 70000;
                          });
                        }),
                        chip('أكثر من \$ 70,000', selectedPrice(70000, null),
                            () {
                          setModalState(() {
                            localMin = 70000;
                            localMax = null;
                          });
                        }),
                      ],
                    ),
                    const SizedBox(height: 22),
                    const Text(
                      'حالة المركبة',
                      style: TextStyle(
                        color: AppColors.luxText,
                        fontSize: 13,
                        fontWeight: FontWeight.w900,
                        fontFamily: 'Cairo',
                      ),
                    ),
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        chip('الكل', localStatus == 'All', () {
                          setModalState(() => localStatus = 'All');
                        }),
                        chip('متاحة', localStatus == 'Available', () {
                          setModalState(() => localStatus = 'Available');
                        }),
                        chip('محجوزة', localStatus == 'Reserved', () {
                          setModalState(() => localStatus = 'Reserved');
                        }),
                      ],
                    ),
                    const SizedBox(height: 26),
                    SizedBox(
                      height: 50,
                      child: ElevatedButton(
                        onPressed: () {
                          provider.applyAdvancedFilters(
                            minPrice: localMin,
                            maxPrice: localMax,
                            selectedStatus: localStatus,
                          );
                          Navigator.pop(context);
                        },
                        style: ElevatedButton.styleFrom(
                          elevation: 0,
                          backgroundColor: AppColors.luxAccent,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(25),
                          ),
                        ),
                        child: const Text(
                          'تطبيق',
                          style: TextStyle(
                            color: Colors.black,
                            fontSize: 13,
                            fontWeight: FontWeight.w900,
                            fontFamily: 'Cairo',
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        );
      },
    );
  }
}
