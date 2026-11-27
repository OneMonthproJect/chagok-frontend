import { describe, expect, it, vi } from 'vitest'
import { ApiError, DEFAULT_MESSAGES, NETWORK_ERROR } from '@/shared/api/client'
import {
  REGISTER_MESSAGES as M,
  duplicateCandidates,
  fieldErrorsToForm,
  guessFieldFromQuery,
  initialRegisterForm,
  mergeSearchItems,
  modelYearRangeMessage,
  phoneMatches,
  submitRegistration,
  toCreateRequest,
  validateRegisterForm,
  type RegisterForm,
} from './registerFlow'
import { NO_CUSTOMERS_MESSAGE, NO_RESULTS_MESSAGE, emptyMessage, rangeText } from './searchFlow'
import type { CustomerSearchItem } from './types'

// M-01 (09 M-01, 04 F-CUS-02, 08 06, 05 POL-120~125)·S-05 (09 S-05·5장) 판단 규칙

const YEAR = 2026

const FILLED: RegisterForm = {
  name: '정우성',
  phone: '010-0000-0005',
  consent: false,
  plateNumber: '90마 0005',
  model: '아반떼',
  modelYear: '2019',
  mileage: '',
}

const customer = (customerId: number, phone: string, plates: string[]): CustomerSearchItem => ({
  customerId,
  name: `고객${customerId}`,
  phone,
  consent: true,
  vehicles: plates.map((plateNumber, i) => ({ vehicleId: customerId * 10 + i, plateNumber })),
})

describe('처음 값', () => {
  it('안내 수신 동의는 체크 안 됨이 기본 (D-11)', () => {
    expect(initialRegisterForm().consent).toBe(false)
    for (const query of ['홍길동', '010-1234-5678', '12가3456']) {
      expect(initialRegisterForm(query).consent).toBe(false)
    }
  })

  it('검색어를 알맞은 칸에 채운다 (09 S-05 💡)', () => {
    expect(guessFieldFromQuery('')).toBeNull()
    expect(initialRegisterForm(' 홍길동 ')).toMatchObject({ name: '홍길동', phone: '', plateNumber: '' })
    expect(initialRegisterForm('010-1234')).toMatchObject({ name: '', phone: '010-1234', plateNumber: '' })
    expect(initialRegisterForm('12가3456')).toMatchObject({ name: '', phone: '', plateNumber: '12가3456' })
  })
})

describe('칸 검사 (08 06 검증과 같은 범위)', () => {
  it('빈 칸: 고객명·연락처·차량번호·차종은 필수, 연식·주행거리는 선택', () => {
    expect(validateRegisterForm(initialRegisterForm(), YEAR)).toEqual({
      name: M.REQUIRED,
      phone: M.REQUIRED,
      plateNumber: M.REQUIRED,
      model: M.REQUIRED,
    })
  })

  it('차종만 비면 차종 칸만 오류 (D-58)', () => {
    expect(validateRegisterForm({ ...FILLED, model: '  ' }, YEAR)).toEqual({ model: M.REQUIRED })
  })

  it('연락처: 숫자·하이픈만, 9~20자', () => {
    expect(validateRegisterForm({ ...FILLED, phone: '010 0000 0005' }, YEAR).phone).toBe(M.PHONE_PATTERN)
    expect(validateRegisterForm({ ...FILLED, phone: '010-12' }, YEAR).phone).toBe(M.PHONE_LENGTH)
  })

  it('연식 1980 ~ 올해+1, 주행거리 정수 0~2,000,000', () => {
    expect(validateRegisterForm({ ...FILLED, modelYear: String(YEAR + 1) }, YEAR)).toEqual({})
    expect(validateRegisterForm({ ...FILLED, modelYear: String(YEAR + 2) }, YEAR).modelYear).toBe(modelYearRangeMessage(YEAR))
    expect(validateRegisterForm({ ...FILLED, modelYear: '1979' }, YEAR).modelYear).toBe('1980년 이후여야 합니다.')
    expect(validateRegisterForm({ ...FILLED, modelYear: '2028' }, YEAR).modelYear).toBe('1980년부터 2027년까지 입력할 수 있습니다.')
    expect(validateRegisterForm({ ...FILLED, modelYear: '20년' }, YEAR).modelYear).toBe(modelYearRangeMessage(YEAR))
    expect(validateRegisterForm({ ...FILLED, mileage: '40,000' }, YEAR)).toEqual({})
    expect(validateRegisterForm({ ...FILLED, mileage: '2000001' }, YEAR).mileage).toBe(M.MILEAGE_MAX)
    expect(validateRegisterForm({ ...FILLED, mileage: '12.5' }, YEAR).mileage).toBe(M.NOT_INTEGER)
  })
})

describe('요청 본문 (08 06)', () => {
  it('차량번호 공백 제거, 빈 선택 칸은 null, 동의는 체크한 그대로', () => {
    expect(toCreateRequest(FILLED)).toEqual({
      name: '정우성',
      phone: '010-0000-0005',
      consent: false,
      vehicle: { plateNumber: '90마0005', model: '아반떼', modelYear: 2019, mileage: null },
    })
    expect(toCreateRequest({ ...FILLED, consent: true, mileage: '40,000' }).vehicle.mileage).toBe(40000)
  })
})

describe('저장 결과 (05 POL-121·122·125)', () => {
  it('성공이면 customerId·vehicleId', async () => {
    const save = vi.fn().mockResolvedValue({ customerId: 12, vehicleId: 13 })
    expect(await submitRegistration(FILLED, save)).toEqual({ kind: 'created', result: { customerId: 12, vehicleId: 13 } })
    expect(save).toHaveBeenCalledWith(toCreateRequest(FILLED))
  })

  it('400 차종 누락은 차종 칸 아래 문구로 (vehicle.model → model)', async () => {
    const save = vi.fn().mockRejectedValue(
      new ApiError(400, 'INVALID_INPUT', '입력값을 확인해 주세요.', [{ field: 'vehicle.model', reason: '필수 입력입니다.' }]),
    )
    expect(await submitRegistration(FILLED, save)).toEqual({ kind: 'invalid', errors: { model: '필수 입력입니다.' }, message: null })
  })

  it('400인데 칸을 알 수 없으면 화면 위 안내 문구', async () => {
    const save = vi.fn().mockRejectedValue(new ApiError(400, 'INVALID_INPUT', '입력값을 확인해 주세요.'))
    expect(await submitRegistration(FILLED, save)).toEqual({ kind: 'invalid', errors: {}, message: '입력값을 확인해 주세요.' })
  })

  it('네트워크 실패: 입력값을 바꾸지 않고, 자동으로 다시 보내지 않는다', async () => {
    const form = { ...FILLED }
    const save = vi.fn().mockRejectedValue(new ApiError(0, NETWORK_ERROR, DEFAULT_MESSAGES[NETWORK_ERROR]))
    const outcome = await submitRegistration(form, save)
    expect(outcome.kind).toBe('failed')
    expect(outcome.kind === 'failed' && outcome.error.code).toBe(NETWORK_ERROR)
    expect(form).toEqual(FILLED)
    expect(save).toHaveBeenCalledTimes(1)
  })

  it('ApiError가 아닌 실패도 공통 오류로 (내부 문구를 보이지 않음)', async () => {
    const save = vi.fn().mockRejectedValue(new TypeError('x is undefined'))
    const outcome = await submitRegistration(FILLED, save)
    expect(outcome.kind === 'failed' && outcome.error.message).toBe(DEFAULT_MESSAGES.INTERNAL_ERROR)
  })

  it('fieldErrors 매핑: 칸이 없는 것은 unmatched', () => {
    expect(
      fieldErrorsToForm([
        { field: 'vehicle.plateNumber', reason: 'a' },
        { field: 'vehicle.mileage', reason: 'b' },
        { field: 'unknown', reason: 'c' },
      ]),
    ).toEqual({ errors: { plateNumber: 'a', mileage: 'b' }, unmatched: [{ field: 'unknown', reason: 'c' }] })
  })
})

describe('같은 연락처·차량번호 기존 고객 (09 M-01)', () => {
  const phoneOnly = customer(1, '010-0000-0005', ['11바0006'])
  const plateOnly = customer(2, '010-9999-0000', ['90마0005'])
  const both = customer(3, '01000000005', ['90 마 0005'])
  const other = customer(4, '010-0000-0050', ['90마00051'])

  it('같은 것만 고르고, 둘 다 같은 고객을 먼저 (공백·하이픈 무시)', () => {
    const candidates = duplicateCandidates([phoneOnly, plateOnly, other, both], FILLED)
    expect(candidates.map((c) => [c.customer.customerId, c.samePhone, c.samePlate])).toEqual([
      [3, true, true],
      [1, true, false],
      [2, false, true],
    ])
    expect(candidates[0].vehicleId).toBe(30)
    expect(candidates[1].vehicleId).toBeNull()
  })

  it('입력이 비어 있으면 후보 없음', () => {
    expect(duplicateCandidates([phoneOnly, plateOnly], { phone: '', plateNumber: '' })).toEqual([])
  })

  it('05가 가린 연락처(08 0.5): 연락처 검색에 나온 고객만, 자리가 맞으면 같은 연락처 (#32)', () => {
    const masked = customer(5, '010-****-0005', ['11바0006'])
    const maskedPlateOnly = customer(6, '010-****-0005', ['90마0005']) // 뒤 4자리만 같은 다른 번호일 수 있음
    const candidates = duplicateCandidates([masked, maskedPlateOnly], FILLED, new Set([5]))
    expect(candidates.map((c) => [c.customer.customerId, c.samePhone, c.samePlate])).toEqual([
      [5, true, false],
      [6, false, true],
    ])
    expect(duplicateCandidates([masked], FILLED)).toEqual([]) // 연락처 검색 결과가 아니면 같은 연락처로 보지 않음
  })

  it('phoneMatches: `*`는 어느 숫자와도 맞고, 하이픈 위치는 무시, 자리 수는 같아야', () => {
    expect(phoneMatches('010-****-0005', '01000000005')).toBe(true)
    expect(phoneMatches('02-***-4567', '02-123-4567')).toBe(true)
    expect(phoneMatches('****-1234', '1588 1234')).toBe(true)
    expect(phoneMatches('010-****-0005', '010-0000-0006')).toBe(false)
    expect(phoneMatches('010-****-0005', '010-000-0005')).toBe(false)
    expect(phoneMatches('010-0000-0005', '010-0000-0005')).toBe(true)
    expect(phoneMatches('010-****-0005', '')).toBe(false)
  })

  it('연락처·차량번호로 따로 검색한 결과를 고객 하나씩으로 합친다', () => {
    expect(mergeSearchItems([[phoneOnly, both], [both, plateOnly]]).map((c) => c.customerId)).toEqual([1, 3, 2])
  })
})

describe('S-05 목록 (09 S-05·5장)', () => {
  it('빈 상태 문구: 검색어 있음 / 없음', () => {
    expect(emptyMessage('홍길동')).toBe(NO_RESULTS_MESSAGE)
    expect(emptyMessage('  ')).toBe(NO_CUSTOMERS_MESSAGE)
  })

  it('건수 "n명 중 a–b"', () => {
    expect(rangeText({ page: 0, size: 20, totalElements: 1, items: [phoneItem()] })).toBe('1명 중 1–1')
    expect(rangeText({ page: 2, size: 20, totalElements: 48, items: Array.from({ length: 8 }, phoneItem) })).toBe('48명 중 41–48')
    expect(rangeText({ page: 0, size: 20, totalElements: 0, items: [] })).toBeNull()
  })
})

function phoneItem(): CustomerSearchItem {
  return customer(1, '010-0000-0001', [])
}
