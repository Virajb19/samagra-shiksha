import { getServerAuth } from "@/lib/server-auth";
import { redirect } from "next/navigation";
import { ReactNode } from "react";

// Keep layouts as server side since they are part of page protection logic
export default async function AuthLayout({children}: {children: ReactNode}) {

   const session = await getServerAuth()
   if(session?.isAuthenticated) {
       redirect('/dashboard')
   }

   return <div className="relative overflow-hidden">
       {children}
   </div>
}