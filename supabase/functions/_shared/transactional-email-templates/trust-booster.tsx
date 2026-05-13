/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import type { TemplateEntry } from './registry.ts'
import { BRAND, Body1, CTA, Greeting, PetSwapEmail, TrustBlock, Title } from '../email-brand.tsx'

interface Props { firstName?: string }

const TrustBoosterEmail = ({ firstName }: Props) => (
  <PetSwapEmail preview="Get verified to build trust faster on PetSwap.">
    <Title>Get verified to build trust faster</Title>
    <Greeting>{firstName ? `Hi ${firstName},` : 'Hi there,'}</Greeting>
    <Body1>
      Verified members on {BRAND.name} get matched faster and chosen more often.
      Verifying your ID takes about 2 minutes and gives you a visible trust badge.
    </Body1>
    <Body1>
      Pet owners want to know who they're trusting with their pet. A verified
      profile is the simplest way to stand out.
    </Body1>
    <CTA href={`${BRAND.url}/verify-identity`}>Verify identity</CTA>
    <TrustBlock
      heading="Why verification matters"
      items={[
        'Boosts your trust score immediately',
        'Helpers and owners feel safer',
        'Your details stay encrypted and private',
      ]}
    />
  </PetSwapEmail>
)

export const template = {
  component: TrustBoosterEmail,
  subject: 'Get verified to build trust faster',
  displayName: 'Trust booster (verify ID)',
  previewData: { firstName: 'Sam' },
} satisfies TemplateEntry
