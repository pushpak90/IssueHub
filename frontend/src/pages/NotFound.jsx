import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-9xl font-bold text-gray-200 dark:text-gray-800">404</h1>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-4">Page not found</h2>
        <p className="text-gray-500 mt-2 mb-8">The page you're looking for doesn't exist.</p>
        <Link to="/dashboard" className="btn-primary">Go to Dashboard</Link>
      </motion.div>
    </div>
  )
}
