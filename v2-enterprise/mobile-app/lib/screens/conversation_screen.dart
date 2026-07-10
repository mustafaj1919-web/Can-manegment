import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:intl/intl.dart';

import '../theme/colors.dart';

class ConversationScreen extends StatefulWidget {
  final String conversationId;
  final String vehicleTitle;
  final bool isManager;
  final dynamic apiService;

  const ConversationScreen({
    Key? key,
    required this.conversationId,
    required this.vehicleTitle,
    this.isManager = false,
    required this.apiService,
  }) : super(key: key);

  @override
  State<ConversationScreen> createState() => _ConversationScreenState();
}

class _ConversationScreenState extends State<ConversationScreen> {
  final TextEditingController _textController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  bool _isLoading = true;
  bool _isSending = false;
  List<Map<String, dynamic>> _messages = [];

  @override
  void initState() {
    super.initState();
    _loadMessages();
  }

  @override
  void dispose() {
    _textController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _loadMessages() async {
    final data =
        await widget.apiService.getConversationMessages(widget.conversationId);
    if (!mounted) return;
    setState(() {
      if (data != null) {
        _messages = List<Map<String, dynamic>>.from(data['messages'] ?? []);
      }
      _isLoading = false;
    });
    WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToBottom());
  }

  void _scrollToBottom() {
    if (!_scrollController.hasClients) return;
    _scrollController.animateTo(
      _scrollController.position.maxScrollExtent,
      duration: const Duration(milliseconds: 250),
      curve: Curves.easeOut,
    );
  }

  Future<void> _handleSend() async {
    final text = _textController.text.trim();
    if (text.isEmpty || _isSending) return;

    setState(() => _isSending = true);
    _textController.clear();

    final message =
        await widget.apiService.sendMessage(widget.conversationId, text);
    if (!mounted) return;

    setState(() {
      if (message != null) {
        _messages = [..._messages, message];
      }
      _isSending = false;
    });
    WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToBottom());
  }

  String _formatTime(String? isoDate) {
    if (isoDate == null) return '';
    try {
      return DateFormat('h:mm a').format(DateTime.parse(isoDate).toLocal());
    } catch (_) {
      return '';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: ui.TextDirection.rtl,
      child: Scaffold(
        backgroundColor: AppColors.luxBg,
        appBar: AppBar(
          backgroundColor: AppColors.luxBg,
          elevation: 0,
          leading: IconButton(
            icon: const Icon(LucideIcons.chevron_right, color: AppColors.luxText),
            onPressed: () => Navigator.of(context).pop(),
          ),
          title: Text(
            widget.vehicleTitle,
            style: const TextStyle(
              color: AppColors.luxText,
              fontSize: 16,
              fontWeight: FontWeight.w800,
              fontFamily: 'Cairo',
            ),
          ),
          centerTitle: true,
        ),
        body: SafeArea(
          child: Column(
            children: [
              Expanded(
                child: _isLoading
                    ? const Center(
                        child: CircularProgressIndicator(
                            color: AppColors.luxAccent),
                      )
                    : _messages.isEmpty
                        ? _emptyState()
                        : ListView.builder(
                            controller: _scrollController,
                            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                            itemCount: _messages.length,
                            itemBuilder: (context, index) =>
                                _messageBubble(_messages[index]),
                          ),
              ),
              _composer(),
            ],
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
            const Icon(
              LucideIcons.message_circle,
              color: AppColors.luxTextMuted,
              size: 32,
            ),
            const SizedBox(height: 14),
            const Text(
              'اكتب أول رسالة عن هذه السيارة',
              style: TextStyle(
                color: AppColors.luxTextMuted,
                fontSize: 13,
                fontFamily: 'Cairo',
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _messageBubble(Map<String, dynamic> message) {
    final senderType = message['senderType'] as String?;
    final isMine =
        widget.isManager ? senderType == 'Admin' : senderType == 'Customer';
    final body = (message['body'] ?? '').toString();
    final time = _formatTime(message['createdAt'] as String?);

    return Align(
      alignment: isMine ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.72,
        ),
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: isMine ? AppColors.luxAccent : AppColors.luxCard,
          borderRadius: BorderRadius.only(
            topRight: const Radius.circular(18),
            topLeft: const Radius.circular(18),
            bottomRight: Radius.circular(isMine ? 4 : 18),
            bottomLeft: Radius.circular(isMine ? 18 : 4),
          ),
          border: isMine ? null : Border.all(color: AppColors.luxBorder),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              body,
              style: TextStyle(
                color: isMine ? Colors.black : AppColors.luxText,
                fontSize: 13.5,
                height: 1.5,
                fontFamily: 'Cairo',
              ),
            ),
            const SizedBox(height: 4),
            Text(
              time,
              style: TextStyle(
                color: isMine
                    ? Colors.black.withOpacity(0.55)
                    : AppColors.luxTextMuted,
                fontSize: 9.5,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _composer() {
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
      decoration: BoxDecoration(
        color: AppColors.luxCard,
        border: Border(top: BorderSide(color: AppColors.luxBorder)),
      ),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _textController,
              textAlign: TextAlign.right,
              minLines: 1,
              maxLines: 4,
              style: const TextStyle(
                color: AppColors.luxText,
                fontSize: 13.5,
                fontFamily: 'Cairo',
              ),
              decoration: InputDecoration(
                hintText: 'اكتب رسالتك...',
                hintStyle: const TextStyle(
                  color: AppColors.luxTextMuted,
                  fontSize: 13,
                  fontFamily: 'Cairo',
                ),
                filled: true,
                fillColor: AppColors.luxBg,
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(24),
                  borderSide: const BorderSide(color: AppColors.luxBorder),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(24),
                  borderSide: const BorderSide(color: AppColors.luxBorder),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(24),
                  borderSide: const BorderSide(color: AppColors.luxAccent),
                ),
              ),
              onSubmitted: (_) => _handleSend(),
            ),
          ),
          const SizedBox(width: 8),
          GestureDetector(
            onTap: _isSending ? null : _handleSend,
            child: Container(
              width: 46,
              height: 46,
              decoration: const BoxDecoration(
                color: AppColors.luxAccent,
                shape: BoxShape.circle,
              ),
              child: _isSending
                  ? const Padding(
                      padding: EdgeInsets.all(12),
                      child: CircularProgressIndicator(
                        color: Colors.black,
                        strokeWidth: 2,
                      ),
                    )
                  : const Icon(
                      LucideIcons.send_horizontal,
                      color: Colors.black,
                      size: 19,
                    ),
            ),
          ),
        ],
      ),
    );
  }
}
