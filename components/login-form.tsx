"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { RiGalleryLine } from "@remixicon/react"
import { signIn } from "@/lib/auth/auth-client"
import { useState } from "react"
import { toast } from "sonner"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [email, setEmail] = useState("")

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const result = await signIn.magicLink({
        email,
        callbackURL: "/",
      })
      if (result.error) {
        toast.error(result.error.message || "Failed to send magic link")
        return
      }
      setEmailSent(true)
      toast.success("Magic link sent! Check your email.")
    } catch (error) {
      console.error(error)
      toast.error("Something went wrong")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form onSubmit={handleSubmit}>
        <FieldGroup>
          <div className="flex flex-col items-center gap-2 text-center">
            <a
              href="#"
              className="flex flex-col items-center gap-2 font-medium"
            >
              <div className="flex size-8 items-center justify-center rounded-md">
                <RiGalleryLine className="size-6" />
              </div>
              <span className="sr-only">Acme Inc.</span>
            </a>
            <h1 className="text-xl font-bold">
              {emailSent ? "Check your email" : "Welcome back"}
            </h1>
            {emailSent ? (
              <FieldDescription>
                We sent a magic link to <strong>{email}</strong>. Click it to
                sign in.
              </FieldDescription>
            ) : (
              <FieldDescription>
                Enter your email and we&apos;ll send you a magic link to sign in.
              </FieldDescription>
            )}
          </div>

          {!emailSent && (
            <>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </Field>
              <Field>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Sending..." : "Send Magic Link"}
                </Button>
              </Field>
            </>
          )}

          {emailSent && (
            <Field>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  setEmailSent(false)
                  setEmail("")
                }}
                disabled={isLoading}
              >
                Use a different email
              </Button>
            </Field>
          )}
        </FieldGroup>
      </form>
      <FieldDescription className="px-6 text-center">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </FieldDescription>
    </div>
  )
}
