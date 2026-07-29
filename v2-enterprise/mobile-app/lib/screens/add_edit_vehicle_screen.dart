import 'package:flutter/material.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import '../theme/colors.dart';
import '../services/api_service.dart';

class AddEditVehicleScreen extends StatefulWidget {
  final Map<String, dynamic>? car; // If null, we are adding new vehicle
  final ApiService apiService;
  final VoidCallback onSaved;

  const AddEditVehicleScreen({
    super.key,
    this.car,
    required this.apiService,
    required this.onSaved,
  });

  @override
  State<AddEditVehicleScreen> createState() => _AddEditVehicleScreenState();
}

class _AddEditVehicleScreenState extends State<AddEditVehicleScreen> {
  final _formKey = GlobalKey<FormState>();
  late String _brand;
  late String _model;
  late int _year;
  late double _price;
  late String _color;
  late int _mileage;
  late String _status;
  late String _branch;

  bool _isSaving = false;
  String? _errorMessage;

  final List<String> _brands = [
    'Toyota',
    'Hyundai',
    'Kia',
    'BYD',
    'BMW',
    'Mercedes',
    'Lexus',
    'Range Rover'
  ];
  final List<String> _statuses = [
    'Available',
    'Sold',
    'Reserved',
    'Maintenance'
  ];

  @override
  void initState() {
    super.initState();
    if (widget.car != null) {
      _brand = widget.car!['brand'] ?? 'Toyota';
      _model = widget.car!['model'] ?? '';
      _year = widget.car!['manufacturing_year'] ?? 2024;
      _price = (widget.car!['selling_price'] as num?)?.toDouble() ?? 0.0;
      _color = widget.car!['color'] ?? 'أسود';
      _mileage = widget.car!['mileage'] ?? 0;
      _status = widget.car!['status'] ?? 'Available';
      _branch = widget.car!['branch'] ?? 'الشركة الرئيسية - بغداد الكريعات';
    } else {
      _brand = 'Toyota';
      _model = '';
      _year = 2024;
      _price = 0.0;
      _color = 'أسود';
      _mileage = 0;
      _status = 'Available';
      _branch = 'الشركة الرئيسية - بغداد الكريعات';
    }
  }

  void _submitForm() async {
    if (!_formKey.currentState!.validate()) return;
    _formKey.currentState!.save();

    setState(() {
      _isSaving = true;
      _errorMessage = null;
    });

    final vehicleData = {
      if (widget.car != null) 'id': widget.car!['id'],
      'brand': _brand,
      'model': _model,
      'manufacturing_year': _year,
      'selling_price': _price,
      'color': _color,
      'mileage': _mileage,
      'status': _status,
      'branch': _branch,
    };

    bool success;
    if (widget.car != null) {
      success = await widget.apiService
          .updateVehicle(widget.car!['id'] ?? 0, vehicleData);
    } else {
      success = await widget.apiService.addVehicle(vehicleData);
    }

    setState(() => _isSaving = false);

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            widget.car != null
                ? 'تم تحديث بيانات السيارة بنجاح'
                : 'تم إضافة السيارة الجديدة لمعروضات الشركة',
            textAlign: TextAlign.right,
          ),
          backgroundColor: AppColors.success,
        ),
      );
      widget.onSaved();
    } else {
      setState(() {
        _errorMessage =
            'حدث خطأ أثناء حفظ التعديلات. يرجى توفير المنفذ البرمجي للإضافة والتعديل.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isEdit = widget.car != null;
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(LucideIcons.chevron_left,
              color: AppColors.textPrimary),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          isEdit ? 'تعديل بيانات المركبة' : 'إضافة مركبة جديدة',
          style: const TextStyle(
            color: AppColors.textPrimary,
            fontWeight: FontWeight.bold,
            fontSize: 16,
            fontFamily: 'Cairo',
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (_errorMessage != null)
                Container(
                  margin: const EdgeInsets.only(bottom: 20),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.red.shade50,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.red.shade100),
                  ),
                  child: Text(
                    _errorMessage!,
                    textAlign: TextAlign.right,
                    style: TextStyle(
                        color: Colors.red.shade800,
                        fontSize: 12,
                        fontFamily: 'Cairo'),
                  ),
                ),

              // Form fields
              _buildFormCard([
                _buildDropdownField<String>(
                  label: 'ماركة السيارة',
                  value: _brand,
                  items: _brands,
                  onChanged: (val) => setState(() => _brand = val!),
                ),
                const SizedBox(height: 16),
                _buildTextField(
                  label: 'موديل السيارة (مثال: GT, C300)',
                  initialValue: _model,
                  onSaved: (val) => _model = val!.trim(),
                  validator: (val) => val == null || val.trim().isEmpty
                      ? 'يرجى إدخال الموديل'
                      : null,
                ),
              ]),

              const SizedBox(height: 16),

              _buildFormCard([
                Row(
                  children: [
                    Expanded(
                      child: _buildTextField(
                        label: 'سنة الصنع',
                        initialValue: _year.toString(),
                        keyboardType: TextInputType.number,
                        onSaved: (val) => _year = int.parse(val!),
                        validator: (val) {
                          if (val == null || int.tryParse(val) == null) {
                            return 'أدخل سنة صالحة';
                          }
                          return null;
                        },
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _buildTextField(
                        label: 'اللون الخارجي',
                        initialValue: _color,
                        onSaved: (val) => _color = val!.trim(),
                        validator: (val) => val == null || val.trim().isEmpty
                            ? 'أدخل اللون'
                            : null,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: _buildTextField(
                        label: 'المسافة المقطوعة (كم)',
                        initialValue: _mileage.toString(),
                        keyboardType: TextInputType.number,
                        onSaved: (val) => _mileage = int.parse(val!),
                        validator: (val) {
                          if (val == null || int.tryParse(val) == null) {
                            return 'أدخل قيمة رقمية';
                          }
                          return null;
                        },
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _buildTextField(
                        label: 'سعر البيع المالي (د.ع)',
                        initialValue: _price.toString(),
                        keyboardType: TextInputType.number,
                        onSaved: (val) => _price = double.parse(val!),
                        validator: (val) {
                          if (val == null || double.tryParse(val) == null) {
                            return 'أدخل قيمة سعرية';
                          }
                          return null;
                        },
                      ),
                    ),
                  ],
                ),
              ]),

              const SizedBox(height: 16),

              _buildFormCard([
                _buildDropdownField<String>(
                  label: 'حالة المعروض الحالية',
                  value: _status,
                  items: _statuses,
                  onChanged: (val) => setState(() => _status = val!),
                ),
                const SizedBox(height: 16),
                _buildTextField(
                  label: 'فرع الشركة المتواجد فيه',
                  initialValue: _branch,
                  onSaved: (val) => _branch = val!.trim(),
                  validator: (val) => val == null || val.trim().isEmpty
                      ? 'أدخل اسم الفرع'
                      : null,
                ),
              ]),

              const SizedBox(height: 32),

              SizedBox(
                height: 52,
                child: ElevatedButton(
                  onPressed: _isSaving ? null : _submitForm,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                    elevation: 0,
                  ),
                  child: _isSaving
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                              color: Colors.white, strokeWidth: 2),
                        )
                      : Text(
                          isEdit ? 'حفظ التعديلات' : 'إضافة المركبة للشركة',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            fontFamily: 'Cairo',
                          ),
                        ),
                ),
              ),
              const SizedBox(height: 40),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFormCard(List<Widget> children) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFF1F5F9)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: children,
      ),
    );
  }

  Widget _buildTextField({
    required String label,
    required String initialValue,
    TextInputType keyboardType = TextInputType.text,
    required FormFieldSetter<String> onSaved,
    required FormFieldValidator<String> validator,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Text(
          label,
          style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.bold,
              color: Color(0xFF64748B),
              fontFamily: 'Cairo'),
        ),
        const SizedBox(height: 8),
        TextFormField(
          initialValue: initialValue,
          keyboardType: keyboardType,
          textAlign: TextAlign.right,
          onSaved: onSaved,
          validator: validator,
          decoration: InputDecoration(
            filled: true,
            fillColor: const Color(0xFFF8FAFC),
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none,
            ),
            errorStyle: const TextStyle(fontFamily: 'Cairo', fontSize: 10),
          ),
        ),
      ],
    );
  }

  Widget _buildDropdownField<T>({
    required String label,
    required T value,
    required List<T> items,
    required ValueChanged<T?> onChanged,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Text(
          label,
          style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.bold,
              color: Color(0xFF64748B),
              fontFamily: 'Cairo'),
        ),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
            color: const Color(0xFFF8FAFC),
            borderRadius: BorderRadius.circular(12),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<T>(
              value: value,
              isExpanded: true,
              alignment: Alignment.centerRight,
              items: items.map((T item) {
                return DropdownMenuItem<T>(
                  value: item,
                  child: Align(
                    alignment: Alignment.centerRight,
                    child: Text(
                      item.toString(),
                      style: const TextStyle(fontSize: 13, fontFamily: 'Cairo'),
                    ),
                  ),
                );
              }).toList(),
              onChanged: onChanged,
            ),
          ),
        ),
      ],
    );
  }
}
