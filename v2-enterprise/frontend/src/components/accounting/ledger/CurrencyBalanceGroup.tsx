'use client'

interface Props {
  currencies: ('USD' | 'IQD')[]
  active: 'USD' | 'IQD'
  onChange: (val: 'USD' | 'IQD') => void
}

export function CurrencyBalanceGroup({ currencies, active, onChange }: Props) {
  if (currencies.length <= 1) return null

  return (
    <div className="flex p-1 bg-slate-100/80 border border-slate-200/50 rounded-xl no-print">
      {currencies.map((curr) => {
        const isActive = active === curr
        return (
          <button
            key={curr}
            onClick={() => onChange(curr)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              isActive 
                ? 'bg-emerald-600 text-white shadow-sm' 
                : 'text-[#475569] hover:bg-slate-200/50'
            }`}
          >
            {curr === 'USD' ? 'الدولار (USD)' : 'الدينار (IQD)'}
          </button>
        )
      })}
    </div>
  )
}
