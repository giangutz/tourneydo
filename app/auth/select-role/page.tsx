import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { RoleSelector } from "@/components/auth/role-selector";

export default async function SelectRolePage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <RoleSelector />
    </div>
  );
}
