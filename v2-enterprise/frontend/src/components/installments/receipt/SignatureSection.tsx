import React from 'react'

interface SignatureSlotProps {
  title: string
  name?: string | null
}

function SignatureSlot({ title, name }: SignatureSlotProps) {
  return (
    <div className="flex-1 min-w-0 text-center leading-none">
      <div className="h-[14px]" />
      <p className="border-t border-[#D1D5DB] pt-1 text-[8px] font-bold text-[#4B5563] truncate">
        {title}
      </p>
      <p className="text-[7.5px] text-[#9CA3AF] truncate mt-0.5">{name || ' '}</p>
    </div>
  )
}

interface SignatureSectionProps {
  cashierName?: string | null
  customerName: string
  managerName?: string | null
}

export function SignatureSection({ cashierName, customerName, managerName }: SignatureSectionProps) {
  return (
    <div className="flex items-start gap-4 flex-1">
      <SignatureSlot title="توقيع العميل" name={customerName} />
      <SignatureSlot title="توقيع أمين الصندوق" name={cashierName} />
      <div className="flex-1 min-w-0 flex flex-col items-center leading-none">
        <div className="h-[30px] w-[30px] rounded-full border border-[#D1D5DB] flex flex-col items-center justify-center text-[#9CA3AF] leading-none">
          <span className="text-[6px] font-bold">ختم</span>
          <span className="text-[6px] font-bold">الشركة</span>
        </div>
        <p className="text-[8px] font-bold text-[#4B5563] mt-1">الختم الرسمي</p>
      </div>
      <SignatureSlot title="اعتماد الإدارة" name={managerName} />
    </div>
  )
}
