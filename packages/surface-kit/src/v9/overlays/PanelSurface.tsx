import React from 'react';
import {
  OverlayDrawer,
  DrawerHeader,
  DrawerHeaderTitle,
  DrawerBody,
  Button,
} from '@fluentui/react-components';
import { Dismiss24Regular } from '@fluentui/react-icons';
import type { PanelSurfaceProps } from '../types';

// The Fluent v9 counterpart of the v8 PanelSurface (a `<Panel>`): a right-edge
// `<OverlayDrawer>`. The v8 medium-vs-custom width heuristic (>500 → medium) maps to the
// v9 Drawer `size`; an explicit `width` renders a custom-width drawer. `isLightDismiss`
// controls backdrop-click dismissal (Esc still closes); `isNonModal` drops the blocking overlay.

/** A Dynamics side panel (Fluent v9 `OverlayDrawer`). */
export const PanelSurface: React.FC<PanelSurfaceProps> = ({
  isOpen,
  onDismiss,
  title,
  drawerSize,
  width,
  hasCloseButton = true,
  isLightDismiss = true,
  isNonModal = false,
  footer,
  children,
}) => {
  const size = drawerSize ?? (width != null && width > 500 ? 'medium' : 'small');
  const customWidthStyle = width != null ? ({ width: `${width}px` } as React.CSSProperties) : undefined;

  return (
    <OverlayDrawer
      open={isOpen}
      position="end"
      size={size}
      modalType={isNonModal ? 'non-modal' : 'modal'}
      style={customWidthStyle}
      onOpenChange={(_e, data) => {
        if (data.open) return;
        // Honor isLightDismiss for backdrop clicks; Esc + explicit close always dismiss.
        if (data.type === 'backdropClick' && !isLightDismiss) return;
        onDismiss?.();
      }}
    >
      <DrawerHeader>
        <DrawerHeaderTitle
          action={
            hasCloseButton && onDismiss ? (
              <Button appearance="subtle" aria-label="Close" icon={<Dismiss24Regular />} onClick={onDismiss} />
            ) : undefined
          }
        >
          {title}
        </DrawerHeaderTitle>
      </DrawerHeader>
      <DrawerBody>
        <div style={{ padding: '12px 0' }}>{children}</div>
        {footer && <div style={{ marginTop: 'auto', paddingTop: 12 }}>{footer}</div>}
      </DrawerBody>
    </OverlayDrawer>
  );
};

export default PanelSurface;
