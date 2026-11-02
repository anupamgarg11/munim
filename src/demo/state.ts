/*
  Demo-only view state that must survive a remount (the phone layout unmounts the app
  surface when you switch to WhatsApp). The runner resets it on Back and Reset.
*/
import { create } from 'zustand'

export type OnboardingStep = 'phone' | 'otp' | 'promise' | 'aa' | 'gmail' | 'reveal'
export const ONBOARDING_STEPS: OnboardingStep[] = ['phone', 'otp', 'promise', 'aa', 'gmail', 'reveal']

interface DemoState {
  step: OnboardingStep
  /** Digits typed for the phone number */
  phone: string
  /** Data sources unticked on the Account Aggregator consent */
  unticked: Record<string, true>
  setStep: (step: OnboardingStep) => void
  setPhone: (phone: string) => void
  toggleSource: (id: string) => void
  resetDemo: () => void
}

const initial = { step: 'phone' as OnboardingStep, phone: '', unticked: {} as Record<string, true> }

export const useDemo = create<DemoState>()((set) => ({
  ...initial,
  setStep: (step) => set({ step }),
  setPhone: (phone) => set({ phone }),
  toggleSource: (id) =>
    set((s) => {
      const unticked = { ...s.unticked }
      if (unticked[id]) delete unticked[id]
      else unticked[id] = true
      return { unticked }
    }),
  resetDemo: () => set({ ...initial, unticked: {} }),
}))
