import LoginForm from './_components/LoginForm'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-zinc-900/80 backdrop-blur-sm rounded-2xl px-8 py-10 flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">Admin</h1>
          <p className="text-sm text-zinc-500 mt-1">Enter your passphrase to continue</p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
