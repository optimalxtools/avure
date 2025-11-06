"use client"

import { useEffect, useState } from "react"
import { onAuthStateChanged } from "firebase/auth"
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  limit,
} from "firebase/firestore"
import { auth, db } from "@/lib/firebase"

type Props = {
  className?: string
  placeholder?: string
  as?: 'p' | 'span'
}

export function ClientName({ className, placeholder = "Start exploring your insights.", as = 'p' }: Props) {
  const [name, setName] = useState<string>("")

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) return setName("")

      try {
        let clientId: string | undefined

        // Try by UID first
        const uidDoc = await getDoc(doc(db, "users", u.uid))
        if (uidDoc.exists()) {
          const d = uidDoc.data() as { clientId?: string; clientID?: string }
          clientId = d.clientId || d.clientID
        }

        // Fallback: query by email
        if (!clientId && u.email) {
          const qUsers = query(
            collection(db, "users"),
            where("email", "==", u.email.toLowerCase().trim()),
            limit(1)
          )
          const snap = await getDocs(qUsers)
          if (!snap.empty) {
            const d = snap.docs[0].data() as { clientId?: string; clientID?: string }
            clientId = d.clientId || d.clientID
          }
        }

        // Resolve client name
        if (clientId) {
          const cSnap = await getDoc(doc(db, "clients", clientId))
          if (cSnap.exists()) {
            setName(((cSnap.data() as { name?: string }).name ?? "").trim())
            return
          }
        }

        setName("")
      } catch {
        setName("")
      }
    })
    return () => unsub()
  }, [])

  if (as === 'span') {
    return <span className={className}>{name || placeholder}</span>
  }
  return <p className={className}>{name || placeholder}</p>
}
