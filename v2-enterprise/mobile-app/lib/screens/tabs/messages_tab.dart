import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter_lucide/flutter_lucide.dart';

import '../../theme/colors.dart';
import '../conversation_screen.dart';

class MessagesTab extends StatefulWidget {
  final String? customerPhotoUrl;
  final bool isManager;
  final dynamic apiService;

  const MessagesTab({
    Key? key,
    this.customerPhotoUrl,
    this.isManager = false,
    required this.apiService,
  }) : super(key: key);

  @override
  State<MessagesTab> createState() => _MessagesTabState();
}

class _MessagesTabState extends State<MessagesTab> {
  bool _isLoading = true;
  bool _unreadOnly = false;
  List<Map<String, dynamic>> _conversations = [];

  @override
  void initState() {
    super.initState();
    _loadConversations();
  }

  Future<void> _loadConversations() async {
    setState(() => _isLoading = true);
    final conversations = await widget.apiService.getConversations();
    if (!mounted) return;
    setState(() {
      _conversations = conversations;
      _isLoading = false;
    });
  }

  String _relativeTime(String? isoDate) {
    if (isoDate == null) return '';
    try {
      final date = DateTime.parse(isoDate).toLocal();
      final diff = DateTime.now().difference(date);
      if (diff.inMinutes < 1) return 'الآن';
      if (diff.inMinutes < 60) return 'قبل ${diff.inMinutes} د';
      if (diff.inHours < 24) return 'قبل ${diff.inHours} س';
      if (diff.inDays < 2) return 'أمس';
      return 'قبل ${diff.inDays} يوم';
    } catch (_) {
      return '';
    }
  }

  @override
  Widget build(BuildContext context) {
    final visible = _unreadOnly
        ? _conversations.where((c) => (c['unreadCount'] ?? 0) > 0).toList()
        : _conversations;

    return Directionality(
      textDirection: ui.TextDirection.rtl,
      child: Container(
        color: AppColors.luxBg,
        child: RefreshIndicator(
          color: AppColors.luxAccent,
          backgroundColor: AppColors.luxCard,
          onRefresh: _loadConversations,
          child: CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              SliverToBoxAdapter(child: _header()),
              if (_isLoading)
                const SliverFillRemaining(
                  child: Center(
                    child: CircularProgressIndicator(color: AppColors.luxAccent),
                  ),
                )
              else if (visible.isEmpty)
                SliverFillRemaining(child: _emptyState())
              else
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 112),
                  sliver: SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (context, index) => _conversationTile(visible[index]),
                      childCount: visible.length,
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _header() {
    final totalUnread = _conversations.fold<int>(
        0, (sum, c) => sum + ((c['unreadCount'] ?? 0) as int));

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 54, 20, 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Container(
                width: 50,
                height: 50,
                padding: const EdgeInsets.all(3),
                decoration: BoxDecoration(
                  color: AppColors.luxCard,
                  shape: BoxShape.circle,
                  border: Border.all(color: AppColors.luxBorder),
                ),
                child: CircleAvatar(
                  backgroundColor: AppColors.luxCardAlt,
                  backgroundImage: widget.customerPhotoUrl == null ||
                          widget.customerPhotoUrl!.isEmpty
                      ? const AssetImage('assets/images/app_logo.png')
                          as ImageProvider
                      : NetworkImage(widget.customerPhotoUrl!),
                ),
              ),
              const Spacer(),
              const Text(
                'الرسائل',
                style: TextStyle(
                  color: AppColors.luxText,
                  fontSize: 19,
                  fontWeight: FontWeight.w900,
                  fontFamily: 'Cairo',
                ),
              ),
              const Spacer(),
              GestureDetector(
                onTap: _loadConversations,
                child: Container(
                  width: 50,
                  height: 50,
                  decoration: BoxDecoration(
                    color: AppColors.luxCard,
                    shape: BoxShape.circle,
                    border: Border.all(color: AppColors.luxBorder),
                  ),
                  child: const Icon(
                    LucideIcons.refresh_cw,
                    color: AppColors.luxText,
                    size: 19,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          Row(
            children: [
              _filterChip('الكل', !_unreadOnly, () {
                setState(() => _unreadOnly = false);
              }),
              const SizedBox(width: 8),
              _filterChip(
                totalUnread > 0 ? 'غير مقروءة ($totalUnread)' : 'غير مقروءة',
                _unreadOnly,
                () {
                  setState(() => _unreadOnly = true);
                },
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _filterChip(String label, bool selected, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 160),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: selected ? AppColors.luxAccentSoft : AppColors.luxCard,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: selected ? AppColors.luxAccent : AppColors.luxBorder,
            width: selected ? 1.4 : 1,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: selected ? AppColors.luxAccent : AppColors.luxTextMuted,
            fontSize: 12,
            fontWeight: selected ? FontWeight.w800 : FontWeight.w500,
            fontFamily: 'Cairo',
          ),
        ),
      ),
    );
  }

  Widget _emptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: AppColors.luxCard,
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.luxBorder),
              ),
              child: const Icon(
                LucideIcons.message_circle,
                color: AppColors.luxTextMuted,
                size: 30,
              ),
            ),
            const SizedBox(height: 18),
            const Text(
              'لا توجد محادثات بعد',
              style: TextStyle(
                color: AppColors.luxText,
                fontSize: 15,
                fontWeight: FontWeight.w800,
                fontFamily: 'Cairo',
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'ابدأ محادثة عن طريق زر المراسلة داخل صفحة أي سيارة',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: AppColors.luxTextMuted,
                fontSize: 12.5,
                height: 1.6,
                fontFamily: 'Cairo',
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _conversationTile(Map<String, dynamic> conversation) {
    final vehicle = conversation['vehicle'] as Map<String, dynamic>?;
    final brand = (vehicle?['brand'] ?? '').toString();
    final model = (vehicle?['model'] ?? 'سيارة').toString();
    final title = brand.isEmpty ? model : '$brand $model';
    final customerName = conversation['customerName'] as String?;
    final lastMessage =
        (conversation['lastMessage'] as String?) ?? 'ابدأ المحادثة الآن';
    final unread = (conversation['unreadCount'] ?? 0) as int;
    final time = _relativeTime(conversation['lastMessageAt'] as String?);

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: GestureDetector(
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (context) => ConversationScreen(
                conversationId: conversation['id'].toString(),
                vehicleTitle: title,
                isManager: widget.isManager,
                apiService: widget.apiService,
              ),
            ),
          ).then((_) => _loadConversations());
        },
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: AppColors.luxCard,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: unread > 0 ? AppColors.luxAccent : AppColors.luxBorder,
              width: unread > 0 ? 1.3 : 1,
            ),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 50,
                height: 50,
                decoration: BoxDecoration(
                  color: AppColors.luxCardAlt,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  LucideIcons.car_front,
                  color: AppColors.luxAccent,
                  size: 22,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: AppColors.luxText,
                              fontSize: 14.5,
                              fontWeight: FontWeight.w800,
                              fontFamily: 'Cairo',
                            ),
                          ),
                        ),
                        Text(
                          time,
                          style: const TextStyle(
                            color: AppColors.luxTextMuted,
                            fontSize: 10.5,
                            fontFamily: 'Cairo',
                          ),
                        ),
                      ],
                    ),
                    if (customerName != null) ...[
                      const SizedBox(height: 2),
                      Text(
                        customerName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: AppColors.luxAccent,
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          fontFamily: 'Cairo',
                        ),
                      ),
                    ],
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            lastMessage,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              color: unread > 0
                                  ? AppColors.luxText
                                  : AppColors.luxTextMuted,
                              fontSize: 12.5,
                              fontWeight:
                                  unread > 0 ? FontWeight.w600 : FontWeight.w400,
                              fontFamily: 'Cairo',
                            ),
                          ),
                        ),
                        if (unread > 0) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 7, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppColors.luxAccent,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Text(
                              '$unread',
                              style: const TextStyle(
                                color: Colors.black,
                                fontSize: 10.5,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
