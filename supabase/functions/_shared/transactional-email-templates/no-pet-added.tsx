/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import type { TemplateEntry } from './registry.ts'
import { BRAND, Body1, CTA, Greeting, PetSwapEmail, TrustBlock, Title } from '../email-brand.tsx'

interface Props { firstName?: string }

const NoPetAddedEmail = ({ firstName }: Props) => (
  <PetSwapEmail preview="Add your pet to start swapping on PetSwap.">
    <Title>Add your pet to start swapping</Title>
    <Greeting>{firstName ? `Hi ${firstName},` : 'Hi there,'}</Greeting>
    <Body1>
      {BRAND.name} works best when your pet has a profile. Add their name, photo,
      and a few quick notes about their care — it only takes a minute.
    </Body1>
    <Body1>
      Once your pet is on {BRAND.name}, you'll be able to request care and start
      matching with trusted helpers near you.
    </Body1>
    <CTA href={`${BRAND.url}/profile`}>Add my pet</CTA>
    <TrustBlock
      heading="Why pet profiles matter"
      items={[
        'Helpers know exactly who they\'re caring for',
        'Care notes keep your pet safe and happy',
        'Builds trust before the first meet',
      ]}
    />
  </PetSwapEmail>
)

export const template = {
  component: NoPetAddedEmail,
  subject: 'Add your pet to start swapping',
  displayName: 'No pet added reminder',
  previewData: { firstName: 'Sam' },
} satisfies TemplateEntry
