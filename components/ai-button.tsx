"use client"

import * as React from "react"
import { Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AIChatbotSidebar } from "./ai-chatbot-sidebar"

interface AIButtonProps {
  currentPage?: string
}

export function AIButton({ currentPage }: AIButtonProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="ghost"
  className="bg-transparent hover:bg-transparent text-[hsl(87,9%,23%)] hover:text-[hsl(87,9%,23%)] [&_svg]:size-6 border-2 border-[hsl(87,9%,23%)]"
        size="icon"
      >
        <Sparkles className="size-6" />
        <span className="sr-only">AI Insights</span>
      </Button>
      
      <AIChatbotSidebar
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        currentPage={currentPage}
      />
    </>
  )
}
