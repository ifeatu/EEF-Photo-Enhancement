import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import type { Session } from "next-auth";

export default async function Home() {
  const session = await getServerSession(authOptions) as Session | null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">{/* Navigation is now handled by SessionWrapper */}

      {/* Hero Section */}
      <div className="relative isolate px-6 pt-14 lg:px-8">
        <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80 pointer-events-none">
          <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" />
        </div>
        
        <div className="mx-auto max-w-2xl py-32 sm:py-48 lg:py-56">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              Restore Your Precious{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                Memories
              </span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Transform old, damaged, or faded photos into stunning, vibrant memories using our AI-powered photo enhancement technology.
            </p>
            <div className="mt-4 inline-flex items-center rounded-full bg-green-50 px-4 py-2 text-sm font-medium text-green-700 ring-1 ring-green-600/20">
              <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              First 3 photo enhancements absolutely FREE!
            </div>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              {!session ? (
                <>
                  <Link
                    href="/api/auth/signin"
                    className="rounded-md bg-blue-600 px-6 py-3 text-lg font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                  >
                    Get Started Free
                  </Link>
                  <Link
                    href="#features"
                    className="text-lg font-semibold leading-6 text-gray-900 hover:text-gray-700"
                  >
                    Learn more <span aria-hidden="true">→</span>
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/dashboard"
                    className="rounded-md bg-blue-600 px-6 py-3 text-lg font-semibold text-white shadow-sm hover:bg-blue-500"
                  >
                    Upload Photo
                  </Link>
                  <Link
                    href="/dashboard"
                    className="text-lg font-semibold leading-6 text-gray-900 hover:text-gray-700"
                  >
                    View Dashboard <span aria-hidden="true">→</span>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div id="features" className="py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl lg:text-center">
              <h2 className="text-base font-semibold leading-7 text-blue-600">
                AI-Powered Enhancement
              </h2>
              <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Bring your photos back to life
              </p>
            </div>
            <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
              <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-2 lg:gap-y-16">
                <div className="relative pl-16">
                  <dt className="text-base font-semibold leading-7 text-gray-900">
                    <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                      <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                      </svg>
                    </div>
                    AI Photo Restoration
                  </dt>
                  <dd className="mt-2 text-base leading-7 text-gray-600">
                    Advanced AI algorithms restore old, damaged, and faded photos automatically.
                  </dd>
                </div>
                <div className="relative pl-16">
                  <dt className="text-base font-semibold leading-7 text-gray-900">
                    <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                      <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                      </svg>
                    </div>
                    Easy Upload
                  </dt>
                  <dd className="mt-2 text-base leading-7 text-gray-600">
                    Simple drag-and-drop interface for quick photo uploads and processing.
                  </dd>
                </div>
                <div className="relative pl-16">
                  <dt className="text-base font-semibold leading-7 text-gray-900">
                    <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                      <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                      </svg>
                    </div>
                    Lightning Fast
                  </dt>
                  <dd className="mt-2 text-base leading-7 text-gray-600">
                    Get your enhanced photos back in minutes, not hours.
                  </dd>
                </div>
                <div className="relative pl-16">
                  <dt className="text-base font-semibold leading-7 text-gray-900">
                    <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                      <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12s-1.536.219-2.121.659c-1.172.879-1.172 2.303 0 3.182l.879.659ZM21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                      </svg>
                    </div>
                    Free to Start
                  </dt>
                  <dd className="mt-2 text-base leading-7 text-gray-600">
                    Get your first 3 photo enhancements completely free - no credit card required!
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Before/After Gallery Section */}
      <div className="bg-gray-50 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              See the Amazing Results
            </h2>
            <p className="mt-4 text-lg leading-8 text-gray-600">
              Our AI technology transforms damaged, faded, and old photos into vibrant memories
            </p>
          </div>
          <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-x-8 gap-y-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
            {/* Photo 1 */}
            <div className="flex flex-col items-center">
              <div className="relative">
                <img
                   className="aspect-[3/2] w-full rounded-2xl bg-gray-100 object-cover object-top sm:aspect-[2/1] lg:aspect-[3/2]"
                   src="/photos/photo-1-before.jpg"
                   alt="Before enhancement - damaged vintage photo"
                 />
                <div className="absolute top-2 left-2 rounded bg-red-500 px-2 py-1 text-xs font-medium text-white">
                  Before
                </div>
              </div>
              <div className="mt-4 text-center">
                <svg className="mx-auto h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
                </svg>
              </div>
              <div className="relative mt-4">
                <img
                   className="aspect-[3/2] w-full rounded-2xl bg-gray-100 object-cover object-top sm:aspect-[2/1] lg:aspect-[3/2]"
                   src="/photos/photo-1-after.png"
                   alt="After enhancement - restored vibrant photo"
                 />
                <div className="absolute top-2 left-2 rounded bg-green-500 px-2 py-1 text-xs font-medium text-white">
                  After
                </div>
              </div>
            </div>

            {/* Photo 2 */}
            <div className="flex flex-col items-center">
              <div className="relative">
                <img
                   className="aspect-[3/2] w-full rounded-2xl bg-gray-100 object-cover object-top sm:aspect-[2/1] lg:aspect-[3/2]"
                   src="/photos/photo-2-before.jpg"
                   alt="Before enhancement - faded old photo"
                 />
                <div className="absolute top-2 left-2 rounded bg-red-500 px-2 py-1 text-xs font-medium text-white">
                  Before
                </div>
              </div>
              <div className="mt-4 text-center">
                <svg className="mx-auto h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
                </svg>
              </div>
              <div className="relative mt-4">
                <img
                   className="aspect-[3/2] w-full rounded-2xl bg-gray-100 object-cover object-top sm:aspect-[2/1] lg:aspect-[3/2]"
                   src="/photos/photo-2-after.png"
                   alt="After enhancement - beautifully restored photo"
                 />
                <div className="absolute top-2 left-2 rounded bg-green-500 px-2 py-1 text-xs font-medium text-white">
                  After
                </div>
              </div>
            </div>

            {/* Photo 3 */}
            <div className="flex flex-col items-center">
              <div className="relative">
                <img
                   className="aspect-[3/2] w-full rounded-2xl bg-gray-100 object-cover object-top sm:aspect-[2/1] lg:aspect-[3/2]"
                   src="/photos/photo-4-before.jpg"
                   alt="Before enhancement - deteriorated vintage photo"
                 />
                <div className="absolute top-2 left-2 rounded bg-red-500 px-2 py-1 text-xs font-medium text-white">
                  Before
                </div>
              </div>
              <div className="mt-4 text-center">
                <svg className="mx-auto h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
                </svg>
              </div>
              <div className="relative mt-4">
                <img
                   className="aspect-[3/2] w-full rounded-2xl bg-gray-100 object-cover object-top sm:aspect-[2/1] lg:aspect-[3/2]"
                   src="/photos/photo-4-after.png"
                   alt="After enhancement - crystal clear restored photo"
                 />
                <div className="absolute top-2 left-2 rounded bg-green-500 px-2 py-1 text-xs font-medium text-white">
                  After
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Subscription CTA Section */}
      <div className="bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Ready to Restore Your Memories?
            </h2>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Start with 3 free enhancements, then choose a plan that works for you. 
              <span className="text-sm text-gray-500 block mt-2">
                Proceeds support the Elder Empowerment Foundation, a 501(c)(3) charity dedicated to improving the lives of seniors.
              </span>
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              {!session ? (
                <>
                  <Link
                    href="/api/auth/signin"
                    className="rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                  >
                    Start Free Trial
                  </Link>
                  <Link
                    href="/pricing"
                    className="text-sm font-semibold leading-6 text-gray-900"
                  >
                    View Pricing <span aria-hidden="true">→</span>
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/dashboard"
                    className="rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                  >
                    Upload Photos
                  </Link>
                  <Link
                    href="/pricing"
                    className="text-sm font-semibold leading-6 text-gray-900"
                  >
                    Get More Credits <span aria-hidden="true">→</span>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
