'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [code, setCode] = useState('')
    const [loading, setLoading] = useState(false)
    const [codeSent, setCodeSent] = useState(false)

    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const result = await signIn('email', {
                email,
                redirect: false,
            })

            if (result?.error) {
                if (result.error === 'AccessDenied') {
                    throw new Error('Only @driek.dev emails are allowed')
                }
                throw new Error(result.error)
            }

            setCodeSent(true)
        } catch (error) {
            if (error instanceof Error) {
                alert(error.message)
            } else {
                alert('An unexpected error occurred')
            }
        } finally {
            setLoading(false)
        }
    }

    const handleVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const result = await signIn('credentials', {
                email,
                token: code,
                redirect: false,
                callbackUrl: '/'
            })

            console.log('Verification result:', result)

            if (result?.error) {
                throw new Error('Invalid code')
            }

            if (result?.url) {
                window.location.href = result.url
            } else {
                window.location.href = '/'
            }
        } catch (error) {
            if (error instanceof Error) {
                alert(error.message)
            } else {
                alert('An unexpected error occurred')
            }
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-lg">
                <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
                    <h2 className="text-2xl font-bold mb-4">Sign In</h2>
                    {!codeSent ? (
                        <form onSubmit={handleSendCode} className="space-y-4">
                            <div>
                                <label
                                    htmlFor="email"
                                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                                >
                                    Email (@driek.dev only)
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 dark:bg-gray-800 dark:border-gray-700"
                                    placeholder="you@driek.dev"
                                    required
                                    pattern=".*@driek\.dev$"
                                />
                            </div>
                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-4 py-2 text-sm bg-foreground text-background rounded-md disabled:opacity-50"
                                >
                                    {loading ? 'Sending...' : 'Send Code'}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleVerifyCode} className="space-y-4">
                            <div>
                                <label
                                    htmlFor="code"
                                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                                >
                                    Enter 6-digit code
                                </label>
                                <input
                                    type="text"
                                    id="code"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 dark:bg-gray-800 dark:border-gray-700"
                                    placeholder="123456"
                                    required
                                    pattern="\d{6}"
                                    maxLength={6}
                                />
                            </div>
                            <div className="flex justify-between items-center">
                                <button
                                    type="button"
                                    onClick={() => setCodeSent(false)}
                                    className="text-sm text-gray-500"
                                >
                                    Use different email
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-4 py-2 text-sm bg-foreground text-background rounded-md disabled:opacity-50"
                                >
                                    {loading ? 'Verifying...' : 'Verify Code'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    )
}