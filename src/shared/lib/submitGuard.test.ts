import { describe, expect, it, vi } from 'vitest'
import { createSubmitGuard } from '@/shared/lib/submitGuard'

// 05 POL-120: 두 번 눌러도 요청은 한 번 (Button이 쓰는 잠금)
describe('createSubmitGuard', () => {
  it('끝나기 전에 다시 부르면 요청 함수는 한 번만 불린다', async () => {
    const guard = createSubmitGuard()
    let resolve!: (v: string) => void
    const save = vi.fn(() => new Promise<string>((r) => { resolve = r }))

    const first = guard.run(save)
    const second = guard.run(save)
    expect(guard.isPending()).toBe(true)
    await Promise.resolve()
    expect(save).toHaveBeenCalledTimes(1)

    resolve('ok')
    await expect(first).resolves.toBe('ok')
    await expect(second).resolves.toBe('ok')
    expect(guard.isPending()).toBe(false)
  })

  it('실패해도 잠금이 풀려 사람이 다시 저장할 수 있다 (POL-125)', async () => {
    const guard = createSubmitGuard()
    const fail = vi.fn(() => Promise.reject(new Error('network')))
    await expect(guard.run(fail)).rejects.toThrow('network')
    expect(guard.isPending()).toBe(false)
    const ok = vi.fn(() => 'saved')
    await expect(guard.run(ok)).resolves.toBe('saved')
    expect(fail).toHaveBeenCalledTimes(1)
    expect(ok).toHaveBeenCalledTimes(1)
  })
})
