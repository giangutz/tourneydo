import { AuthDebug } from "@/components/debug/auth-debug";

export default function AuthDebugPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8">
          TourneyDo Auth Debug
        </h1>
        <AuthDebug />
      </div>
    </div>
  );
}
