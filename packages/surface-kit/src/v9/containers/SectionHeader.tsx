import React from 'react';
import {
  Button,
  Text,
  Toolbar,
  ToolbarButton,
  tokens,
} from '@fluentui/react-components';
import { ChevronDown20Regular, ChevronRight20Regular } from '@fluentui/react-icons';
import type { SectionHeaderProps } from '../types';
import { ceForm } from '../../tokens';
import { useLook } from '../../hooks/useLook';

// v9 section header: flex title + status on the left, a v9 <Toolbar> of commandItems on the
// right (replacing the v8 CommandBar), Dynamics neutral underline, optional collapse chevron.

/** Section header bar (Fluent v9): title + status (left), toolbar / actions (right), optional collapse toggle. */
export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  statusText,
  showCommandBar,
  commandItems = [],
  actions,
  collapsible,
  collapsed,
  onToggle,
  look: lookProp,
}) => {
  // Follows the ambient FormSurface look, like Section, unless given explicitly.
  const ambientLook = useLook();
  const ce = (lookProp ?? ambientLook) === 'ce';
  // CE: the measured section title is 24px tall (4px top pad + 20px line), with no rule and no
  // gap below it; the first field row follows immediately (rows own their top padding).
  const ceRootStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'nowrap',
    paddingTop: ceForm.section.titlePaddingTop,
    minHeight: ceForm.section.titleHeight - ceForm.section.titlePaddingTop,
    width: '100%',
  };
  const rootStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'nowrap',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    marginBottom: 16,
    minHeight: 48,
    width: '100%',
  };
  const leftStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 };
  const statusStyle: React.CSSProperties = {
    marginLeft: 8,
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  };

  return (
    <div style={ce ? ceRootStyle : rootStyle} data-surface-part="section-header">
      <div style={leftStyle}>
        {collapsible && (
          <Button
            appearance="subtle"
            size="small"
            icon={collapsed ? <ChevronRight20Regular /> : <ChevronDown20Regular />}
            onClick={onToggle}
            aria-label={collapsed ? 'Expand section' : 'Collapse section'}
            aria-expanded={!collapsed}
          />
        )}
        {title &&
          (ce ? (
            // Rendered exactly as given: Dynamics does not uppercase section titles (the stock
            // Account labels are typed uppercase; "Description" renders mixed-case).
            <Text
              as="h2"
              weight="semibold"
              size={300}
              style={{ margin: 0, lineHeight: `${ceForm.section.titleLineHeight}px`, color: tokens.colorNeutralForeground1 }}
              data-surface-part="section-title"
            >
              {title}
            </Text>
          ) : (
            <Text weight="semibold" size={300}>
              {title}
            </Text>
          ))}
        {statusText && <span style={statusStyle}>{statusText}</span>}
      </div>
      {actions ? (
        <div>{actions}</div>
      ) : showCommandBar && commandItems.length > 0 ? (
        <Toolbar aria-label="Section commands" size="small">
          {commandItems.map((item) => (
            <ToolbarButton
              key={item.id}
              icon={item.icon}
              appearance={item.appearance === 'primary' ? 'primary' : 'subtle'}
              disabled={item.disabled}
              onClick={item.onClick}
            >
              {item.label}
            </ToolbarButton>
          ))}
        </Toolbar>
      ) : null}
    </div>
  );
};

export default SectionHeader;
