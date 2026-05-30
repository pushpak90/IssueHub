import { useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { User, Bell, Palette, Shield } from 'lucide-react'
import { userService } from '../services/userService'
import { toggleTheme } from '../store/slices/uiSlice'
import toast from 'react-hot-toast'

const tabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'notifications', label: 'Notifications', icon: Bell },
]

export default function Settings() {
  const { user } = useSelector(s => s.auth)
  const { theme } = useSelector(s => s.ui)
  const dispatch = useDispatch()
  const [activeTab, setActiveTab] = useState('profile')

  const { register, handleSubmit } = useForm({
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phone: '',
      bio: '',
    },
  })

  const mutation = useMutation({
    mutationFn: userService.updateMe,
    onSuccess: () => toast.success('Profile updated!'),
  })

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your account preferences</p>
      </div>

      <div className="flex gap-6">
        {/* Tab list */}
        <div className="w-48 shrink-0">
          <nav className="space-y-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab content */}
        <div className="flex-1">
          {activeTab === 'profile' && (
            <div className="card p-6">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-5">Profile Information</h2>
              <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
                <div className="flex items-center gap-4 mb-5">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-100 text-primary-700 text-xl font-bold dark:bg-primary-900/30">
                    {user?.firstName?.[0] || user?.username?.[0] || '?'}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {user?.firstName ? `${user.firstName} ${user.lastName}` : user?.username}
                    </p>
                    <p className="text-sm text-gray-500">{user?.email}</p>
                    <div className="flex gap-1 mt-1">
                      {user?.roles?.map(r => (
                        <span key={r} className="badge text-xs bg-primary-50 text-primary-700">{r.replace('ROLE_', '')}</span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name</label>
                    <input {...register('firstName')} className="input" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name</label>
                    <input {...register('lastName')} className="input" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                  <input {...register('phone')} type="tel" className="input" placeholder="+1 234 567 890" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bio</label>
                  <textarea {...register('bio')} className="input resize-none min-h-[80px]" placeholder="Tell us about yourself..." />
                </div>
                <button type="submit" disabled={mutation.isPending} className="btn-primary">
                  {mutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="card p-6">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-5">Appearance</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Theme</p>
                  <div className="grid grid-cols-2 gap-3">
                    {['light', 'dark'].map(t => (
                      <button
                        key={t}
                        onClick={() => theme !== t && dispatch(toggleTheme())}
                        className={`flex items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                          theme === t ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <span className="text-lg">{t === 'light' ? '☀️' : '🌙'}</span>
                        <span className="text-sm font-medium capitalize text-gray-900 dark:text-white">{t} Mode</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="card p-6">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-5">Notification Preferences</h2>
              <div className="space-y-3">
                {[
                  { label: 'Ticket assignments', desc: 'When a ticket is assigned to you' },
                  { label: 'Status changes', desc: 'When ticket status is updated' },
                  { label: 'New comments', desc: 'When someone comments on your ticket' },
                  { label: 'Mentions', desc: 'When someone mentions you' },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{item.label}</p>
                      <p className="text-xs text-gray-500">{item.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-primary-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
