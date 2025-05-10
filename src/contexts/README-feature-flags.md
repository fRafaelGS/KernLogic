# Feature Flags

This system provides a way to toggle features on and off without deploying new code, enabling progressive rollouts and A/B testing of new features.

## Available Flags

| Flag Name | Purpose |
|-----------|---------|
| `useNewPricingUI` | Enable the new pricing UI components throughout the app |
| `useNewPricingData` | Switch to using the new pricing data model and API endpoints |

## Environment Variables

To control feature flags, set the following environment variables:

```
NEXT_PUBLIC_USE_NEW_PRICING_UI=true|false
NEXT_PUBLIC_USE_NEW_PRICING_DATA=true|false
```

For local development, create a `.env.local` file with these variables. For production, set these variables in your hosting platform.

## Usage in Components

```tsx
import { useFeatureFlags } from '@/contexts/FeatureFlagsContext';

function MyComponent() {
  const { useNewPricingUI, useNewPricingData } = useFeatureFlags();
  
  return (
    <div>
      {useNewPricingUI ? (
        <NewPricingComponent />
      ) : (
        <LegacyPricingComponent />
      )}
    </div>
  );
}
```

## Rollout Strategy for Pricing Transition

1. **Phase 1: Data Migration**
   - Enable neither flag
   - Run Django migration to copy legacy prices to new price table
   - All UI still uses legacy price field

2. **Phase 2: Dual Data**
   - Set `NEXT_PUBLIC_USE_NEW_PRICING_UI=true`
   - New UI is shown, but falls back to legacy price if no base price exists
   - Legacy price field still maintained

3. **Phase 3: Full Migration**
   - Set `NEXT_PUBLIC_USE_NEW_PRICING_DATA=true` 
   - UI only uses the new price table data
   - Run migration to remove legacy price field

## Testing Override

For testing specific feature flag combinations without changing environment variables:

```tsx
// In a test file or component
import { FeatureFlagsProvider } from '@/contexts/FeatureFlagsContext';

<FeatureFlagsProvider overrideFlags={{ useNewPricingUI: true }}>
  <ComponentToTest />
</FeatureFlagsProvider>
``` 