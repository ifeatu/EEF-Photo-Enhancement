'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"

const ISSUE_TYPES = [
  { value: 'billing', label: 'Billing/Reimbursements' },
  { value: 'tech', label: 'Tech Support' },
  { value: 'comments', label: 'Comments & Feedback' },
  { value: 'account', label: 'Account Issues' },
  { value: 'photo-stuck', label: 'Photo Processing Issues' },
  { value: 'other', label: 'Other' }
]

interface SupportFormProps {
  user?: {
    id: string
    email?: string
    name?: string
  } | null
}

export default function SupportForm({ user }: SupportFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    issueType: '',
    subject: '',
    message: '',
    photoUrl: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/support', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          userId: user?.id
        })
      })

      if (response.ok) {
        setIsSubmitted(true)
        setFormData({
          name: user?.name || '',
          email: user?.email || '',
          issueType: '',
          subject: '',
          message: '',
          photoUrl: ''
        })
      } else {
        throw new Error('Failed to submit support request')
      }
    } catch (error) {
      console.error('Support form error:', error)
      alert('Failed to submit support request. Please try again or email us directly at contact@platinumeagle.io')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  if (isSubmitted) {
    return (
      <div className="text-center p-8 bg-green-50 rounded-lg border border-green-200">
        <div className="text-green-600 text-4xl mb-4">✅</div>
        <h3 className="text-xl font-semibold text-green-800 mb-2">
          Support Request Submitted
        </h3>
        <p className="text-green-700 mb-4">
          Thank you for contacting us! We've received your support request and will respond within 24 hours.
        </p>
        <p className="text-sm text-green-600">
          You should receive a confirmation email at {formData.email} shortly.
        </p>
        <Button
          onClick={() => setIsSubmitted(false)}
          className="mt-4 bg-green-600 hover:bg-green-700"
        >
          Submit Another Request
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Name Field */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            value={formData.name}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Your full name"
          />
        </div>

        {/* Email Field */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            Email Address *
          </label>
          <input
            type="email"
            id="email"
            name="email"
            required
            value={formData.email}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="your.email@example.com"
          />
        </div>
      </div>

      {/* Issue Type Dropdown */}
      <div>
        <label htmlFor="issueType" className="block text-sm font-medium text-gray-700 mb-2">
          Issue Type *
        </label>
        <select
          id="issueType"
          name="issueType"
          required
          value={formData.issueType}
          onChange={handleInputChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Please select an issue type</option>
          {ISSUE_TYPES.map(type => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      {/* Subject Field */}
      <div>
        <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
          Subject *
        </label>
        <input
          type="text"
          id="subject"
          name="subject"
          required
          value={formData.subject}
          onChange={handleInputChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Brief description of your issue"
        />
      </div>

      {/* Photo URL Field (conditional) */}
      {formData.issueType === 'photo-stuck' && (
        <div>
          <label htmlFor="photoUrl" className="block text-sm font-medium text-gray-700 mb-2">
            Photo URL (for processing issues)
          </label>
          <input
            type="url"
            id="photoUrl"
            name="photoUrl"
            value={formData.photoUrl}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="https://photoenhance.dev/photos/..."
          />
          <p className="text-xs text-gray-500 mt-1">
            If you have a specific photo that's not processing, please provide the URL from your browser address bar when viewing the photo.
          </p>
        </div>
      )}

      {/* Message Field */}
      <div>
        <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
          Message *
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={6}
          value={formData.message}
          onChange={handleInputChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical"
          placeholder="Please describe your issue in detail. Include any error messages, steps you've taken, and any other relevant information."
        />
      </div>

      {/* User Info (if logged in) */}
      {user && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Account Info:</strong> We'll automatically include your account details with this support request for faster resolution.
          </p>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          * Required fields
        </p>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Submitting...
            </>
          ) : (
            'Submit Support Request'
          )}
        </Button>
      </div>

      {/* Direct Email Option */}
      <div className="border-t pt-4 mt-6">
        <p className="text-sm text-gray-600 text-center">
          You can also email us directly at{' '}
          <a
            href="mailto:contact@platinumeagle.io"
            className="text-blue-600 hover:text-blue-500 font-medium"
          >
            contact@platinumeagle.io
          </a>
        </p>
      </div>
    </form>
  )
}