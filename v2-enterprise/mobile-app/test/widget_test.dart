import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:alasdeqa_auto/screens/welcome_screen.dart';

void main() {
  testWidgets('WelcomeScreen UI Rendering and Button Interactions', (WidgetTester tester) async {
    bool loginPressed = false;

    // Build WelcomeScreen
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: WelcomeScreen(
            onLoginPressed: () {
              loginPressed = true;
            },
          ),
        ),
      ),
    );

    // Let the entry animations complete
    await tester.pump(const Duration(seconds: 1));

    // Verify key titles/buttons exist
    expect(find.text('ارتقِ بتجربة قيادتك اليوم'), findsOneWidget);
    expect(find.text('تسجيل الدخول'), findsOneWidget);

    // Tap Login Button
    await tester.tap(find.text('تسجيل الدخول'));
    await tester.pump();
    expect(loginPressed, isTrue);
  });
}
