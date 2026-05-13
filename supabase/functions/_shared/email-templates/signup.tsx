/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  BRAND,
  Body1,
  CTA,
  Greeting,
  Note,
  PetSwapEmail,
  Title,
} from '../email-brand.tsx'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({ confirmationUrl }: SignupEmailProps) => (
  <PetSwapEmail preview={`Welcome to ${BRAND.name} 🐾 — confirm your email to get started.`}>
    <Title>Welcome to {BRAND.name} 🐾</Title>
    <Greeting>Hi there,</Greeting>
    <Body1>
      Welcome to {BRAND.name} — a trusted community where pet owners help
      each other.
    </Body1>
    <Body1>
      One quick step: confirm your email address so we know it's really you.
    </Body1>
    <CTA href={confirmationUrl}>Confirm my email</CTA>
    <Body1>
      Once you're in, you can complete your profile, add your pets, and
      explore matches near you.
    </Body1>
    <Note>If you didn't create an account, you can safely ignore this email.</Note>
  </PetSwapEmail>
)

export default SignupEmail
