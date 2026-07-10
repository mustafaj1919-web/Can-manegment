import 'dart:async';
import 'dart:math';
import 'dart:ui';
import 'package:flutter/material.dart';
import '../theme/colors.dart';

class WelcomeScreen extends StatefulWidget {
  final VoidCallback onLoginPressed;

  const WelcomeScreen({
    Key? key,
    required this.onLoginPressed,
  }) : super(key: key);

  @override
  State<WelcomeScreen> createState() => _WelcomeScreenState();
}

class _WelcomeScreenState extends State<WelcomeScreen>
    with TickerProviderStateMixin {
  late PageController _pageController;
  late AnimationController _floatController;
  late AnimationController _pulseController;
  late AnimationController _entryController;
  
  int _currentCarIndex = 0;
  double _pageOffset = 0.0;
  late Timer _autoPlayTimer;

  // High-Quality Luxury Car Images
  final List<String> _carImages = [
    'assets/images/mercedes.png',
    'assets/images/range_rover.png',
    'assets/images/tesla.png',
  ];

  final List<String> _carNames = [
    'مرسيدس جي تي كوبيه',
    'رينج روفر سبورت سبيشال',
    'تسلا موديل S بلاد',
  ];

  final List<Color> _glowColors = [
    const Color(0xFFE2E8F0), // Mercedes silver/white glow
    const Color(0xFF00E5FF), // Range Rover cyan glow
    const Color(0xFF3B82F6), // Tesla blue glow
  ];

  @override
  void initState() {
    super.initState();
    
    _pageController = PageController(viewportFraction: 0.85);
    _pageController.addListener(() {
      setState(() {
        _pageOffset = _pageController.page ?? 0.0;
      });
    });

    // Slow floating loop (2.5 seconds per cycle)
    _floatController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2500),
    )..repeat(reverse: true);

    // Pulse animation for ambient brand logo glowing glow
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2000),
    )..repeat(reverse: true);

    // Fade/Slide up entries on startup (800ms)
    _entryController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..forward();

    // Smooth autoplay slides
    _autoPlayTimer = Timer.periodic(const Duration(seconds: 5), (timer) {
      if (_pageController.hasClients) {
        int nextPage = (_currentCarIndex + 1) % _carImages.length;
        _pageController.animateToPage(
          nextPage,
          duration: const Duration(milliseconds: 900),
          curve: Curves.easeInOutCubic,
        );
      }
    });
  }

  @override
  void dispose() {
    _pageController.dispose();
    _floatController.dispose();
    _pulseController.dispose();
    _entryController.dispose();
    _autoPlayTimer.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final double topPadding = MediaQuery.of(context).padding.top;
    final Color currentGlowColor = _glowColors[_currentCarIndex];

    return Scaffold(
      backgroundColor: AppColors.luxBg, // #0A0A0D Graphite/Black
      body: Stack(
        children: [
          // ─── BACKGROUND AMBIENT GLOWS (Matching Active Car) ───
          AnimatedContainer(
            duration: const Duration(milliseconds: 1000),
            curve: Curves.easeOut,
            child: Stack(
              children: [
                // Top Left Blur Glow
                Positioned(
                  top: -120,
                  left: -80,
                  child: Container(
                    width: 320,
                    height: 320,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: currentGlowColor.withOpacity(0.08),
                    ),
                  ),
                ),
                // Center Right Blur Glow
                Positioned(
                  top: 220,
                  right: -90,
                  child: Container(
                    width: 260,
                    height: 260,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: currentGlowColor.withOpacity(0.05),
                    ),
                  ),
                ),
              ],
            ),
          ),

          // ─── MAIN COLUMN LAYOUT ───
          Column(
            children: [
              // 1. Top Section - Logo + Immersive Swipable Car PageView
              Expanded(
                child: Stack(
                  children: [
                    // Top Header Brand Logo with pulsing glow
                    Positioned(
                      top: topPadding + 14,
                      left: 24,
                      right: 24,
                      child: Center(
                        child: AnimatedBuilder(
                          animation: _pulseController,
                          builder: (context, child) {
                            final double blurGlow = 10.0 + (_pulseController.value * 12.0);
                            return Container(
                              height: 52,
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(14),
                                boxShadow: [
                                  BoxShadow(
                                    color: currentGlowColor.withOpacity(0.12),
                                    blurRadius: blurGlow,
                                    spreadRadius: 2,
                                  ),
                                ],
                              ),
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(14),
                                child: Image.asset(
                                  'assets/images/app_logo.png',
                                  fit: BoxFit.contain,
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                    ),

                    // Interactive Drag-and-Swipe Parallax Car Slider
                    Positioned.fill(
                      top: topPadding + 80,
                      bottom: 10,
                      child: PageView.builder(
                        controller: _pageController,
                        physics: const BouncingScrollPhysics(),
                        onPageChanged: (index) {
                          setState(() {
                            _currentCarIndex = index;
                          });
                        },
                        itemCount: _carImages.length,
                        itemBuilder: (context, index) {
                          // Compute parallax card scale and translation offsets
                          double difference = index - _pageOffset;
                          double percent = (1 - (difference.abs() * 0.18)).clamp(0.0, 1.0);
                          double rotation = difference * 0.08;

                          return Center(
                            child: Transform.scale(
                              scale: percent,
                              child: Transform.rotate(
                                angle: rotation,
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    // Animated Floating Stage
                                    AnimatedBuilder(
                                      animation: _floatController,
                                      builder: (context, child) {
                                        final double floatOffset =
                                            sin(_floatController.value * 2 * pi) * 6.0;
                                        return Transform.translate(
                                          offset: Offset(0, floatOffset),
                                          child: Container(
                                            width: 250,
                                            height: 180,
                                            decoration: BoxDecoration(
                                              borderRadius: BorderRadius.circular(24),
                                              boxShadow: [
                                                BoxShadow(
                                                  color: _glowColors[index].withOpacity(0.14),
                                                  blurRadius: 40,
                                                  spreadRadius: 4,
                                                  offset: const Offset(0, 8),
                                                ),
                                              ],
                                            ),
                                            child: ClipRRect(
                                              borderRadius: BorderRadius.circular(24),
                                              child: Image.asset(
                                                _carImages[index],
                                                fit: BoxFit.contain,
                                              ),
                                            ),
                                          ),
                                        );
                                      },
                                    ),
                                    const SizedBox(height: 16),
                                    // Car name
                                    Text(
                                      _carNames[index],
                                      style: TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.bold,
                                        color: index == _currentCarIndex
                                            ? AppColors.cyanAccent
                                            : Colors.grey.shade600,
                                        fontFamily: 'Cairo',
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  ],
                ),
              ),

              // 2. Bottom Section - Premium Glassmorphic Bottom Panel
              SlideTransition(
                  position: Tween<Offset>(
                    begin: const Offset(0.0, 0.4),
                    end: Offset.zero,
                  ).animate(CurvedAnimation(
                    parent: _entryController,
                    curve: Curves.easeOutBack,
                  )),
                  child: FadeTransition(
                    opacity: _entryController,
                    child: ClipRRect(
                      borderRadius: const BorderRadius.vertical(top: Radius.circular(35)),
                      child: BackdropFilter(
                        filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
                        child: Container(
                          width: double.infinity,
                          decoration: BoxDecoration(
                            color: AppColors.luxCard.withOpacity(0.78), // frosted glass container
                            borderRadius: const BorderRadius.vertical(top: Radius.circular(35)),
                            border: Border.all(
                              color: Colors.white.withOpacity(0.07),
                              width: 1,
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withOpacity(0.4),
                                blurRadius: 30,
                                offset: const Offset(0, -10),
                              ),
                            ],
                          ),
                          padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 24),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.center,
                            children: [
                              // Swipable Carousel Dot Indicators
                              Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: List.generate(_carImages.length, (index) {
                                  final isSelected = _currentCarIndex == index;
                                  return AnimatedContainer(
                                    duration: const Duration(milliseconds: 300),
                                    margin: const EdgeInsets.symmetric(horizontal: 4),
                                    height: 6,
                                    width: isSelected ? 20 : 6,
                                    decoration: BoxDecoration(
                                      color: isSelected
                                          ? AppColors.cyanAccent
                                          : Colors.white.withOpacity(0.15),
                                      borderRadius: BorderRadius.circular(3),
                                    ),
                                  );
                                }),
                              ),
                              const SizedBox(height: 20),

                              // Headline
                              const Text(
                                'ارتقِ بتجربة قيادتك اليوم',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  fontSize: 22,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                  fontFamily: 'Cairo',
                                ),
                              ),
                              const SizedBox(height: 10),

                              // Sub-Description
                              Text(
                                'تصفح أرقى موديلات السيارات المتوفرة لدى شركة الاصدقاء، وتابع أقساطك ودفعاتك المالية بكل أمان وسلاسة من منصة واحدة متكاملة.',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.grey.shade400,
                                  height: 1.6,
                                  fontFamily: 'Cairo',
                                ),
                              ),
                              const SizedBox(height: 20),

                              // Primary Sign-In CTA button with Gradient
                              Container(
                                width: double.infinity,
                                height: 50,
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(25),
                                  gradient: const LinearGradient(
                                    colors: [Color(0xFF00E5FF), Color(0xFF0284C7)],
                                    begin: Alignment.topLeft,
                                    end: Alignment.bottomRight,
                                  ),
                                  boxShadow: [
                                    BoxShadow(
                                      color: AppColors.cyanAccent.withOpacity(0.25),
                                      blurRadius: 16,
                                      offset: const Offset(0, 4),
                                    ),
                                  ],
                                ),
                                child: ElevatedButton(
                                  onPressed: widget.onLoginPressed,
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: Colors.transparent,
                                    shadowColor: Colors.transparent,
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(25),
                                    ),
                                  ),
                                  child: const Text(
                                    'تسجيل الدخول',
                                    style: TextStyle(
                                      color: Colors.black,
                                      fontSize: 14,
                                      fontWeight: FontWeight.bold,
                                      fontFamily: 'Cairo',
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(height: 8),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
