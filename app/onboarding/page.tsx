'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { completeOnboarding } from './_actions';

export default function OnboardingPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    organizationName: '',
    organizationType: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const formDataObj = new FormData(e.target as HTMLFormElement);
      const result = await completeOnboarding(formDataObj);

      if (result.success) {
        // Redirect based on organization type
        const organizationType = formDataObj.get('organizationType') as string;

        // Tournament organizers and federations go to tournament management dashboard
        if (organizationType === 'tournament-organizer' || organizationType === 'federation') {
          window.location.href = '/dashboard/tournaments';
        } else {
          // Other organization types (gyms, schools, etc.) go to athlete registration dashboard
          window.location.href = '/dashboard/athletes';
        }
      } else {
        console.error('Onboarding failed:', result.error);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Onboarding error:', error);
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-red-600 rounded-full mb-4">
            <span className="text-white text-2xl font-bold">T</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Tourneydo!</h1>
          <p className="text-gray-600">Let's set up your tournament management account</p>
        </div>

        {/* Onboarding Form */}
        <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="organizationName" className="block text-sm font-medium text-gray-700 mb-2">
                Organization Name
              </label>
              <input
                type="text"
                id="organizationName"
                name="organizationName"
                value={formData.organizationName}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Enter your organization or gym name"
              />
            </div>

            <div>
              <label htmlFor="organizationType" className="block text-sm font-medium text-gray-700 mb-2">
                Organization Type
              </label>
              <select
                id="organizationType"
                name="organizationType"
                value={formData.organizationType}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="">Select organization type</option>
                <option value="taekwondo-gym">Taekwondo Gym/Dojang</option>
                <option value="tournament-organizer">Tournament Organizer</option>
                <option value="federation">National/State Federation</option>
                <option value="school">School/University</option>
                <option value="other">Other</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-red-600 hover:from-blue-700 hover:to-red-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Setting up your account...' : 'Complete Setup'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            This information helps us personalize your tournament management experience
          </p>
        </div>
      </div>
    </div>
  );
}
