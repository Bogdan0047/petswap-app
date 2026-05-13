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

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({ confirmationUrl }: MagicLinkEmailProps) => (
  <PetSwapEmail preview={`Your sign-in link for ${BRAND.name}.`}>
    <Title>Your sign-in link</Title>
    <Greeting>Hi there,</Greeting>
    <Body1>
      Tap the button below to sign in to {BRAND.name}. This link expires
      shortly for your safety.
    </Body1>
    <CTA href={confirmationUrl}>Sign in to {BRAND.name}</CTA>
    <Note>If you didn't request this, you can safely ignore this email.</Note>
  </PetSwapEmail>
)

export default MagicLinkEmail
