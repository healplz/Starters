'use client'

import { useActionState } from 'react'
import { loginAction } from '@/app/actions/auth'

type State = { error?: string } | null

export default function LoginForm() {
  const [state, formAction, pending] = useActionState<State, FormData>(loginAction, null)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input
        type="password"
        name="passphrase"
        placeholder="Passphrase"
        required
        autoFocus
        className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-zinc-500"
      />
      {state?.error && (
        <p className="text-sm text-red-400">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full px-4 py-3 rounded-lg bg-white text-zinc-900 text-sm font-medium hover:bg-zinc-100 active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}
