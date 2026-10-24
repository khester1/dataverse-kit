import React from 'react';
import { Panel, PanelType } from '@fluentui/react';
import type { PanelSurfaceProps } from '../types';
import { panelKindFromWidth, panelCustomWidthPx } from '../core/sizePresets';

// Extracted from export-engine generatePanelForm (v8 <Panel> branch): headerText,
// type derived from width (>500 → medium, else custom + customWidth), footer at bottom.
// Exposes the full 8-literal panelType (a superset of the codegen's medium/custom binary).

/** A Dynamics side panel (Fluent v8 Panel). */
export const PanelSurface: React.FC<PanelSurfaceProps> = ({
  isOpen,
  onDismiss,
  title,
  panelType,
  width,
  hasCloseButton = true,
  isLightDismiss = false,
  isFooterAtBottom = true,
  isNonModal = false,
  footer,
  children,
}) => {
  const kind = panelType ?? panelKindFromWidth(width);
  const resolvedType = PanelType[kind];
  const customWidth = kind === 'custom' || kind === 'customNear' ? `${panelCustomWidthPx(width)}px` : undefined;

  return (
    <Panel
      isOpen={isOpen}
      onDismiss={onDismiss}
      headerText={title}
      type={resolvedType}
      customWidth={customWidth}
      hasCloseButton={hasCloseButton}
      isLightDismiss={isLightDismiss}
      isFooterAtBottom={isFooterAtBottom}
      isBlocking={!isNonModal}
      onRenderFooterContent={footer ? () => <>{footer}</> : undefined}
    >
      <div style={{ padding: '12px 0' }}>{children}</div>
    </Panel>
  );
};

export default PanelSurface;
