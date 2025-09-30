import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-red-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-red-600 rounded-full mb-4">
            <span className="text-white text-2xl font-bold">T</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Tourneydo</h1>
          <p className="text-gray-600">Taekwondo Tournament Management Platform</p>
        </div>

        {/* Sign In Form */}
        <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
          <SignIn
            appearance={{
              elements: {
                formButtonPrimary: 'bg-gradient-to-r from-blue-600 to-red-600 hover:from-blue-700 hover:to-red-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg',
                card: 'shadow-none border-none bg-transparent p-0',
                headerTitle: 'hidden',
                headerSubtitle: 'hidden',
                socialButtonsBlockButton: 'border border-gray-200 hover:border-gray-300 transition-colors duration-200',
                formFieldInput: 'border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg',
                formFieldLabel: 'text-gray-700 font-medium',
                footerActionLink: 'text-blue-600 hover:text-blue-700 font-medium',
                dividerLine: 'bg-gray-200',
                dividerText: 'text-gray-500',
              },
            }}
          />
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            Manage your taekwondo tournaments with ease
          </p>
        </div>
      </div>
    </div>
  );
}
