// 두 번 눌러도 요청은 한 번 (05 POL-120). Button이 쓰는 잠금 로직만 따로 둔 것이다.
// run(fn): 앞의 fn이 끝나기 전에 다시 부르면 fn을 부르지 않고 앞의 결과를 그대로 돌려준다.

export interface SubmitGuard {
  run<T>(fn: () => T | Promise<T>): Promise<T>
  isPending(): boolean
}

export function createSubmitGuard(): SubmitGuard {
  let pending: Promise<unknown> | null = null
  return {
    run<T>(fn: () => T | Promise<T>): Promise<T> {
      if (pending) return pending as Promise<T>
      const current = Promise.resolve().then(fn)
      pending = current
      // 성공·실패 모두 끝나면 다시 누를 수 있다 (실패 시 입력값 유지·재시도는 사람이, POL-125)
      current.then(
        () => { pending = null },
        () => { pending = null },
      )
      return current
    },
    isPending: () => pending !== null,
  }
}
