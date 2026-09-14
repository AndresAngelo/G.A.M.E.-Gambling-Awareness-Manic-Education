// Shared type-only declarations for the motion module, kept separate from tokens.ts/variants.ts
// so consumers that only need the direction type don't pull in the token/variant implementations.

/**
 * Direction the View_Navigator resolves per navigation, per Requirement 4.1/4.2: `'backward'`
 * when the destination view is `'home'`, `'forward'` for every other destination. Derived
 * purely from the destination view value — see Requirement 4.3.
 */
export type NavigationDirection = 'forward' | 'backward'
