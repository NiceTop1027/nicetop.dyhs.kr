"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, Loader2, Wifi } from "lucide-react"

export function AWSConnectionTest() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message?: string
    error?: string
    timestamp?: string
  } | null>(null)

  const testConnection = async () => {
    setIsLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/test-aws-connection")
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        success: false,
        error: "네트워크 오류가 발생했습니다.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wifi className="h-5 w-5" />
          AWS 연결 테스트
        </CardTitle>
        <CardDescription>S3 버킷과 EC2 인스턴스 연결 상태를 확인합니다.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={testConnection} disabled={isLoading} className="w-full">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              연결 테스트 중...
            </>
          ) : (
            "연결 테스트 시작"
          )}
        </Button>

        {result && (
          <Alert variant={result.success ? "default" : "destructive"}>
            {result.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <AlertDescription>
              {result.success ? result.message : result.error}
              {result.timestamp && (
                <div className="text-xs mt-1 opacity-70">{new Date(result.timestamp).toLocaleString()}</div>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <div>• S3 버킷: nt-security-challenges-files</div>
          <div>• EC2 인스턴스: i-0bed387f9f4e30541</div>
          <div>• 리전: ap-northeast-2 (서울)</div>
        </div>
      </CardContent>
    </Card>
  )
}
