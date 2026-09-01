'use client'

import { useState } from 'react'
import Navbar from '@/components/dashboard/Navbar'
import FeedbackWidget from '@/components/beta/FeedbackWidget'
import Container from '@/components/ui/Container'

interface Props {
  userEmail: string
  children: React.ReactNode
}

export default function AuthenticatedShell({ userEmail, children }: Props) {
  const [feedbackOpen, setFeedbackOpen] = useState(false)

  return (
    <div className="min-h-screen bg-ground">
      <Navbar userEmail={userEmail} onOpenFeedback={() => setFeedbackOpen(true)} />
      <main><Container className="pt-10 pb-feedback-clear">{children}</Container></main>
      <FeedbackWidget open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </div>
  )
}
