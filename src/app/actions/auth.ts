'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

type LoginState = { error?: string } | null

export async function loginAction(_prevState: LoginState, formData: FormData) {
  const passphrase = formData.get('passphrase')?.toString() ?? ''

  if (passphrase !== process.env.ADMIN_PASSPHRASE) {
    return { error: 'Incorrect passphrase.' }
  }

  const cookieStore = await cookies()
  cookieStore.set('admin_session', '1', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  })

  redirect('/admin')
}
