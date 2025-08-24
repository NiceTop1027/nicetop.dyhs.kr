"use client"

import { AWSConnectionTest } from "@/components/aws-connection-test"
import { AWSFileUploader } from "@/components/aws-file-uploader"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function AWSTestPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">AWS 연동 테스트</h1>
        <p className="text-muted-foreground">Amazon S3와 EC2 연동 상태를 확인하고 파일 업로드를 테스트합니다.</p>
      </div>

      <Tabs defaultValue="connection" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="connection">연결 테스트</TabsTrigger>
          <TabsTrigger value="upload">파일 업로드 테스트</TabsTrigger>
        </TabsList>

        <TabsContent value="connection" className="space-y-4">
          <div className="flex justify-center">
            <AWSConnectionTest />
          </div>
        </TabsContent>

        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>파일 업로드 테스트</CardTitle>
              <CardDescription>실제 파일을 S3에 업로드하고 EC2로 전송하는 기능을 테스트합니다.</CardDescription>
            </CardHeader>
            <CardContent>
              <AWSFileUploader
                challengeType="wargame"
                challengeId="test-challenge"
                onUploadComplete={(fileData) => {
                  console.log("업로드 완료:", fileData)
                  alert(`파일 업로드 성공: ${fileData.name}`)
                }}
                maxFiles={3}
                maxSize={50}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
