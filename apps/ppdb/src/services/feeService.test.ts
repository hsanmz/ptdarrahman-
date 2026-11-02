import { describe, it, expect } from 'vitest'
import { computeFeeItem, FALLBACK_FEES_SUMMARY } from './feeService'

describe('feeService', () => {
  it('correctly calculates nominal regular and early discounts', () => {
    const item = {
      id: 'item-1',
      name: 'Uang Pangkal',
      nominal: 10000000,
      discount_type: 'nominal' as const,
      discount_value: 1000000,
      early_discount_type: 'nominal' as const,
      early_discount_value: 2000000,
    }

    const calculated = computeFeeItem(item)

    expect(calculated.regularDiscountAmount).toBe(1000000)
    expect(calculated.regularFinalPrice).toBe(9000000)
    expect(calculated.earlyDiscountAmount).toBe(2000000)
    expect(calculated.earlyFinalPrice).toBe(8000000)
  })

  it('correctly calculates percentage discounts', () => {
    const item = {
      id: 'item-2',
      name: 'SPP',
      nominal: 2000000,
      discount_type: 'percent' as const,
      discount_value: 10, // 10%
      early_discount_type: 'percent' as const,
      early_discount_value: 25, // 25%
    }

    const calculated = computeFeeItem(item)

    expect(calculated.regularDiscountAmount).toBe(200000)
    expect(calculated.regularFinalPrice).toBe(1800000)
    expect(calculated.earlyDiscountAmount).toBe(500000)
    expect(calculated.earlyFinalPrice).toBe(1500000)
  })

  it('provides a valid fallback fees summary', () => {
    expect(FALLBACK_FEES_SUMMARY.formFee).toBeGreaterThan(0)
    expect(FALLBACK_FEES_SUMMARY.minimumDp).toBeGreaterThan(0)
    expect(FALLBACK_FEES_SUMMARY.items.length).toBeGreaterThan(0)
  })
})
