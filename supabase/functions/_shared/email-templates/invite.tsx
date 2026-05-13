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

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({ confirmationUrl }: InviteEmailProps) => (
  <PetSwapEmail preview={`You've been invited to join ${BRAND.name}.`}>
    <Title>You've been invited to {BRAND.name}</Title>
    <Greeting>Hi there,</Greeting>
    <Body1>
      A friend has invited you to join {BRAND.name} — a trusted community
      where pet owners help each other.
    </Body1>
    <CTA href={confirmationUrl}>Accept invitation</CTA>
    <Note>
      If you weren't expecting this invitation, you can safely ignore this
      email.
    </Note>
  </PetSwapEmail>
)

export default InviteEmail
