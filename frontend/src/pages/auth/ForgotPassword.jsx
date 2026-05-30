import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Zap, ArrowLeft } from 'lucide-react'

export default function ForgotPassword() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 via-white to-indigo-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600 shadow-lg shadow-primary-200">
            <Zap className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Reset password</h1>
          <p className="mt-1 text-sm text-gray-500">Enter your email to receive a reset link</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-card">
          <form className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Email address</label>
              <input type="email" placeholder="you@example.com" className="input" />
            </div>
            <button type="submit" className="btn-primary w-full h-10">Send reset link</button>
          </form>
          <Link to="/login" className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-4 w-4" /> Back to sign in
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
