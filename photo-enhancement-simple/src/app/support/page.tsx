import { getCurrentUser } from '@/lib/auth-utils'
import SupportForm from '@/components/SupportForm'

export default async function SupportPage() {
  const user = await getCurrentUser()

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
            Support Center
          </h1>
          <p className="mt-4 text-xl text-gray-600">
            We're here to help! Get in touch with our support team.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Form */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow-lg rounded-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Submit a Support Request
              </h2>
              <SupportForm user={user?.user} />
            </div>
          </div>

          {/* FAQ & Support Info */}
          <div className="space-y-6">
            {/* Quick Help */}
            <div className="bg-white shadow-lg rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Quick Help
              </h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">
                    Photo stuck processing?
                  </h4>
                  <p className="text-sm text-gray-600">
                    Most photos process within 5 seconds. If it's been longer, please submit a tech support request.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">
                    Need more credits?
                  </h4>
                  <p className="text-sm text-gray-600">
                    Visit our <a href="/pricing" className="text-blue-600 hover:text-blue-500">pricing page</a> to purchase additional credits.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">
                    Account issues?
                  </h4>
                  <p className="text-sm text-gray-600">
                    Use the billing/account support option for login problems or account-related questions.
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="bg-blue-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-4">
                Contact Information
              </h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium text-blue-900">Email:</span>
                  <br />
                  <span className="text-blue-700">contact@platinumeagle.io</span>
                </div>
                <div>
                  <span className="font-medium text-blue-900">Response Time:</span>
                  <br />
                  <span className="text-blue-700">Usually within 24 hours</span>
                </div>
                <div>
                  <span className="font-medium text-blue-900">Available:</span>
                  <br />
                  <span className="text-blue-700">Monday - Friday, 9 AM - 6 PM EST</span>
                </div>
              </div>
            </div>

            {/* FAQ */}
            <div className="bg-white shadow-lg rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Frequently Asked Questions
              </h3>
              <div className="space-y-4 text-sm">
                <details className="group">
                  <summary className="font-medium text-gray-900 cursor-pointer hover:text-blue-600">
                    How do I download my enhanced photos?
                  </summary>
                  <p className="mt-2 text-gray-600 pl-4">
                    Once processing is complete, click the "Download Enhanced" button on your photo's detail page or from your dashboard.
                  </p>
                </details>
                
                <details className="group">
                  <summary className="font-medium text-gray-900 cursor-pointer hover:text-blue-600">
                    What file formats are supported?
                  </summary>
                  <p className="mt-2 text-gray-600 pl-4">
                    We support JPEG, PNG, and WebP image formats. Maximum file size is 10MB.
                  </p>
                </details>
                
                <details className="group">
                  <summary className="font-medium text-gray-900 cursor-pointer hover:text-blue-600">
                    Can I get a refund if I'm not satisfied?
                  </summary>
                  <p className="mt-2 text-gray-600 pl-4">
                    We offer refunds on a case-by-case basis. Please contact support with details about your specific situation.
                  </p>
                </details>
                
                <details className="group">
                  <summary className="font-medium text-gray-900 cursor-pointer hover:text-blue-600">
                    How long are my photos stored?
                  </summary>
                  <p className="mt-2 text-gray-600 pl-4">
                    Your photos are stored securely and are accessible from your account indefinitely. We never delete user photos.
                  </p>
                </details>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}