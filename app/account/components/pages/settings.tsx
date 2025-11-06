"use client"

import * as React from "react"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

export default function AccountSettings() {
  const [name, setName] = React.useState<string>("")
  const [email, setEmail] = React.useState<string>("")
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        const display = u.displayName || (u.email ? u.email.split("@")[0] : "")
        setName(display || "")
        setEmail(u.email || "")
      } else {
        setName("")
        setEmail("")
      }
      setLoading(false)
    })
    return () => unsub()
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 sm:grid-cols-2 max-w-2xl">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={loading ? "" : name} readOnly placeholder="Name" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={loading ? "" : email} readOnly placeholder="Email" />
        </div>
      </CardContent>
    </Card>
  )
}

