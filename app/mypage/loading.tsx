import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Skeleton } from "@/components/ui/skeleton"

export default function LoadingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mb-6">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-4 w-1/4 mt-2" />
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-1">
              <Skeleton className="h-[500px] w-full rounded-lg" />
            </div>
            <div className="md:col-span-2">
              <Skeleton className="h-12 w-full mb-4 rounded-lg" />
              <Skeleton className="h-[500px] w-full rounded-lg" />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
