export interface QuickPhrase {
  id: string;
  text: string;
}

export const QUICK_PHRASES: readonly QuickPhrase[] = [
  { id: 'yes', text: 'Yes.' },
  { id: 'no', text: 'No.' },
  {
    id: 'please-wait',
    text: 'Please wait — I use assistive communication and need more time to respond.',
  },
  { id: 'still-speaking', text: 'I am still speaking.' },
  { id: 'do-not-hang-up', text: 'Please do not hang up.' },
  { id: 'repeat-that', text: 'Can you repeat that?' },
  { id: 'not-what-i-meant', text: 'That is not what I meant.' },
  { id: 'need-to-type', text: 'I need to type this.' },
] as const;
