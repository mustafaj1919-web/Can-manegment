export async function getDashboard() {
  const res = await fetch('/api/dashboard')
  if (!res.ok) return null
  const payload = await res.json()
  const data = payload.stats || payload
  return {
    available_cars: Number(data.available_cars_count || data.available_cars || 0),
    sold_cars: Number(data.sold_cars_count || data.sold_cars || 0),
    customers: Number(data.customers_count || data.customers || 0),
    sales: Number(data.sales_count || data.sales || 0),
    purchases: Number(data.purchases_count || data.purchases || 0),
    installments: Number(data.installments || 0),
    cashbox_balance: Number(data.cashbox_balance || 0)
  }
}

export async function getInventory(params={}){
  const qs = new URLSearchParams(params)
  const res = await fetch(`/api/inventory?${qs.toString()}`)
  if(!res.ok) throw new Error(`فشل تحميل المخزون: ${res.status}`)
  return res.json()
}

export async function getCustomers(params={}){
  const qs = new URLSearchParams(params)
  const res = await fetch(`/api/customers?${qs.toString()}`)
  if(!res.ok) throw new Error(`فشل تحميل العملاء: ${res.status}`)
  return res.json()
}
