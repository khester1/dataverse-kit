// Register Fluent icons once for component tests (mirrors .storybook/preview.tsx),
// so Icon-using surfaces (e.g. the Section collapse chevron) don't warn.
import { initializeIcons } from '@fluentui/react';
import { setIconOptions } from '@fluentui/react/lib/Styling';

setIconOptions({ disableWarnings: true });
initializeIcons();
