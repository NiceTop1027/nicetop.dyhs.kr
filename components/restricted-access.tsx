"use client"

import type React from "react"
import { useSanctionCheck } from "@/lib/sanction-middleware"
import { Card, CardContent } from "@/components/ui/card"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

interface RestrictedAccessProps {
  children: React.ReactNode
}

const RestrictedAccess: React.FC<RestrictedAccessProps> = ({ children }) => {
  const accessCheck = useSanctionCheck()
  const router = useRouter()

  if (!accessCheck.canAccess) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-700 mb-2">접근 제한</h3>
            <p className="text-red-600">{accessCheck.reason}</p>
            <Button variant="outline" className="mt-4" onClick={() => router.push("/account/restricted")}>
              자세히 보기
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}

export default RestrictedAccess
