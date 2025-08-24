import type { Timestamp } from "firebase/firestore"

export interface Banner {
  id: string
  title: string
  description: string
  imageUrl: string
  linkUrl?: string
  isActive: boolean
  order: number
  backgroundColor: string
  textColor: string
  buttonText?: string
  buttonColor?: string
  createdAt: Timestamp | { toDate: () => Date }
  updatedAt: Timestamp | { toDate: () => Date }
  createdBy: string
  startDate?: Timestamp | { toDate: () => Date }
  endDate?: Timestamp | { toDate: () => Date }
}

export interface BannerSettings {
  autoSlide: boolean
  slideInterval: number // seconds
  showDots: boolean
  showArrows: boolean
  pauseOnHover: boolean
}
