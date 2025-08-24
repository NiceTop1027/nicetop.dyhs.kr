import { type NextRequest, NextResponse } from "next/server"
import { EC2_HOST, EC2_USERNAME, S3_BUCKET_NAME } from "@/lib/aws-config"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
  try {
    const { s3FileName, ec2Path } = await request.json()

    if (!s3FileName || !ec2Path) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 })
    }

    // EC2에서 S3 파일 다운로드 명령어 실행
    const command = `ssh -i ~/.ssh/your-key.pem ${EC2_USERNAME}@${EC2_HOST} "aws s3 cp s3://${S3_BUCKET_NAME}/${s3FileName} ${ec2Path}"`

    await execAsync(command)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("EC2 transfer error:", error)
    return NextResponse.json({ error: "Transfer failed" }, { status: 500 })
  }
}
