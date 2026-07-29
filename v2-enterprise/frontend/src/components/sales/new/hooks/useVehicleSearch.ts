'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getAvailableCars, CarOption } from '@/lib/api/sales'

export function useVehicleSearch(selectedCarId: string) {
  const [searchTerm, setSearchTerm] = useState('')

  const { data: cars = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ['available-cars'],
    queryFn: getAvailableCars,
    staleTime: 60_000,
  })

  // Debounced/filtered inventory search list
  const filteredCars = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return cars
    return cars.filter(car => {
      const brand = (car.brand || '').toLowerCase()
      const model = (car.model || '').toLowerCase()
      const vin = (car.vin || '').toLowerCase()
      const plate = (car.plate_number || '').toLowerCase()
      const year = String(car.manufacturing_year || '')
      return (
        brand.includes(q) ||
        model.includes(q) ||
        vin.includes(q) ||
        plate.includes(q) ||
        year.includes(q)
      )
    })
  }, [cars, searchTerm])

  const selectedCar = useMemo(() => {
    return cars.find(c => String(c.id) === selectedCarId)
  }, [cars, selectedCarId])

  return {
    searchTerm,
    setSearchTerm,
    cars: filteredCars,
    totalCarsCount: cars.length,
    isLoading,
    isFetching,
    refetch,
    selectedCar,
  }
}
