/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import type { TemplateEntry } from './registry.ts'
import { BRAND, Body1, CTA, Greeting, PetSwapEmail, TrustBlock, Title } from '../email-brand.tsx'

interface Props { firstName?: string }

const InactiveWinbackEmail = ({ firstName }: Props) => (
  <PetSwapEmail preview="Your pet network is waiting on PetSwap.">
    <Title>Your pet network is waiting</Title>
    <Greeting>{firstName ? `Hi ${firstName},` : 'Hi there,'}</Greeting>
    <Body1>
      There are new pet owners and helpers near you on {BRAND.name} this week.
      Come back and see who you can connect with.
    </Body1>
    <Body1>
      Whether you need a sitter or want to help out, your trusted local
      community is just a tap away.
    </Body1>
    <CTA href={`${BRAND.url}/explore`}>Explore PetSwap</CTA>
    <TrustBlock
      heading="What's new for you"
      items={[
        'Fresh helpers and care requests near you',
        'Updated trust scores from recent swaps',
        'Quick re-entry — no setup needed',
      ]}
    />
  </PetSwapEmail>
)

export const template = {
  component: InactiveWinbackEmail,
  subject: 'Your pet network is waiting',
  displayName: 'Inactive user winback',
  previewData: { firstName: 'Sam' },
} satisfies TemplateEntry
