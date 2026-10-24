import React from 'react';
import {
  Avatar,
  Button,
  Menu,
  MenuItemRadio,
  MenuList,
  MenuPopover,
  MenuTrigger,
  Text,
  createFocusOutlineStyle,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { ChevronDown12Regular, ChevronDown20Regular, ChevronUp20Regular } from '@fluentui/react-icons';
import type { FormHeaderProps, SurfaceHeaderField } from '../types';
import { ceForm } from '../../tokens';
import { useLook } from '../../hooks/useLook';

// ★ look="ce" is the MEASURED Dynamics record header region (dynamics-ui-kit
//   apps/ce-parity/reference/captures/account-main-summary-1710.txt, `header.*`). Everything in it
//   is a stock Fluent part laid out to the measured geometry:
//   - the record avatar is Fluent `Avatar color="colorful"` hashed from the title — Fluent's hash
//     gives "Adatum Division (Showcase)" cranberry, exactly the measured #eeacb2 / #6e0811;
//   - the form switcher's menu is Fluent `MenuItemRadio` in a `MenuPopover` — the measured 4px
//     padding, shadow16, 32px items and 16px check slot are Fluent's own;
//   - the header-field values/labels are Fluent's 300 (14/20) and 200 (12/16) ramp steps.
//   Geometry below is measured, each constant commented with its capture.

const H = ceForm.header;
// Header-field value top sits 4px below the region's content top (value y 137 vs 133).
const FIELD_TOP = 4;
// The owner avatar sits 9px down (142 vs 133), 10px before the owner name (1440.1+32 → 1482.1).
const OWNER_AVATAR_TOP = 9;
const OWNER_NAME_GAP = 10;
// The dot between entity name and switcher (entity ends 287+52.3=339.3, dot 347.3–350.3, switcher 358.4).
const SUBTITLE_DOT_SPACING = 8;
// The switcher row sits directly under the title row (switcher top 163.5 = title-row bottom: the
// row is 30.5 tall because the status baseline-aligns 2.5px below the title), so it has no margin.
// The entity text then centres in the 22px row (text top 165.3 = title top + ceForm subtitleOffset).
const SUBTITLE_ROW_TOP = 0;
// The expand chevron sits 18px after the owner name (1482.1+136.9=1619 → 1637).
const EXPAND_GAP = 18;
// Dividers start 6px below the content top (divider y 139 vs 133).
const DIVIDER_TOP = 6;
// The presence dot: an 8px dot in a 2px white ring (12 in all) hanging 2px outside the avatar's
// bottom-right corner (dot box at +22,+22 of a 32px avatar).
const PRESENCE_RING = 2;
const PRESENCE_DOT = H.presenceSize - 2 * PRESENCE_RING;
export const cePresenceBadgeStyle: Readonly<React.CSSProperties> = Object.freeze({
  width: PRESENCE_DOT,
  height: PRESENCE_DOT,
  boxSizing: 'content-box',
  // Fluent's badge carries 1px padding and a 10px icon; zero the padding and clip the icon to the dot.
  padding: 0,
  overflow: 'hidden',
  border: `${PRESENCE_RING}px solid ${tokens.colorNeutralBackground1}`,
  right: -PRESENCE_RING,
  bottom: -PRESENCE_RING,
});
// UNMEASURED: the minimum space between the title block and the header fields (the fields are
// right-aligned; in the capture the space was ~580px). Only matters when the header is crowded.
const FIELDS_MIN_GAP = 16;
// UNMEASURED: the narrowest the title block may get before the fields yield (narrow headers only).
const CE_TITLE_MIN_WIDTH = 120;

const useStyles = makeStyles({
  // The owner name as a link-button: no chrome, but a VISIBLE keyboard focus ring (Fluent's).
  ownerLink: {
    background: 'none',
    border: 'none',
    padding: 0,
    margin: 0,
    font: 'inherit',
    color: tokens.colorBrandForegroundLink,
    cursor: 'pointer',
    ':hover': { color: tokens.colorBrandForegroundLinkHover, textDecorationLine: 'underline' },
    ...createFocusOutlineStyle(),
  },
  // Narrow headers: the title keeps a minimum width (it truncates with an ellipsis) and the fields
  // block shrinks and clips rather than pushing past the card. Dynamics moves the fields into the
  // header flyout at narrow widths (unmeasured, not modelled).
  fields: {
    display: 'flex',
    alignItems: 'flex-start',
    flexShrink: 1,
    minWidth: 0,
    overflow: 'hidden',
  },
  switcher: {
    display: 'inline-flex',
    alignItems: 'center',
    // Measured switcher 74.3 wide for "Account" (52.3): 2×2 padding + 2×1 border + 4 gap + 12 icon.
    gap: '4px',
    height: `${H.switcherHeight}px`,
    padding: `0 ${H.switcherPaddingX}px`,
    border: '1px solid transparent',
    borderRadius: tokens.borderRadiusMedium,
    background: 'transparent',
    color: tokens.colorNeutralForeground2,
    fontFamily: 'inherit',
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
    lineHeight: tokens.lineHeightBase300,
    cursor: 'pointer',
    ':hover': { backgroundColor: tokens.colorSubtleBackgroundHover },
    ...createFocusOutlineStyle(),
    // Measured OPEN: fill #e0e0e0 = colorSubtleBackgroundPressed (Fluent's MenuButton would use
    // Selected, #ebebeb — so this is set explicitly) and text #242424 = colorNeutralForeground1
    // (idle is #424242). ★ The open state must also win over :hover — the pointer is still on the
    // trigger after the click that opened it, and hover's #f5f5f5 was what showed. The ce-parity
    // gate checks the open trigger with the pointer on it AND away from it.
    '&[aria-expanded="true"], &[aria-expanded="true"]:hover': {
      backgroundColor: tokens.colorSubtleBackgroundPressed,
      color: tokens.colorNeutralForeground1,
    },
  },
});

const isEmpty = (v: unknown) => v === null || v === undefined || v === '';

function FieldTile({ field }: { field: SurfaceHeaderField }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', paddingTop: FIELD_TOP, minWidth: 0 }} data-surface-part="header-field">
      <Text weight="semibold" size={300} wrap={false} style={{ color: tokens.colorNeutralForeground1 }} data-surface-part="header-field-value">
        {isEmpty(field.value) ? '---' : field.value}
      </Text>
      <Text size={200} wrap={false} style={{ color: tokens.colorNeutralForeground1 }} data-surface-part="header-field-label">
        {field.label}
      </Text>
    </div>
  );
}

function Divider() {
  return (
    <div
      aria-hidden="true"
      style={{
        width: H.dividerWidth,
        height: H.dividerHeight,
        margin: `${DIVIDER_TOP}px ${H.dividerSpacing}px 0`,
        backgroundColor: tokens.colorNeutralStroke2,
        flexShrink: 0,
      }}
      data-surface-part="header-divider"
    />
  );
}

function CeFormHeader(props: FormHeaderProps) {
  const {
    title,
    subtitle,
    status,
    titleColor,
    persona,
    actions,
    className,
    entityName,
    forms,
    activeFormId,
    onFormChange,
    headerFields,
    owner,
    onExpand,
    expanded,
    titleAs,
  } = props;
  const styles = useStyles();
  const activeForm = forms?.find((f) => f.id === activeFormId) ?? forms?.[0];
  const entity = entityName ?? subtitle;
  // Decorative: the title is announced by the heading right after it.
  const avatar =
    persona ?? (typeof title === 'string' ? <Avatar name={title} color="colorful" size={H.avatarSize} aria-hidden /> : null);
  const TitleTag = titleAs ?? 'h1';

  return (
    <div
      className={className}
      style={{ display: 'flex', alignItems: 'flex-start', padding: H.padding.map((v) => `${v}px`).join(' '), minWidth: 0 }}
      data-surface-part="form-header"
      data-look="ce"
    >
      {avatar && (
        // The avatar sits in a 2px transparent ring (tile 44 = 40 + 2 × 2), 14px before the title.
        <div style={{ padding: H.avatarRing, marginRight: H.avatarToTitleGap, flexShrink: 0 }} data-surface-part="header-avatar">
          {avatar}
        </div>
      )}
      <div style={{ minWidth: CE_TITLE_MIN_WIDTH, flex: '1 1 auto' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', minWidth: 0 }}>
          {title != null && (
            <Text
              as={TitleTag}
              weight="semibold"
              size={500}
              truncate
              wrap={false}
              style={{ margin: 0, lineHeight: `${H.titleLineHeight}px`, color: titleColor ?? tokens.colorNeutralForeground1 }}
              data-surface-part="header-title"
            >
              {title}
            </Text>
          )}
          {status != null && (
            <span
              style={{
                paddingLeft: H.statusPaddingLeft,
                fontSize: tokens.fontSizeBase300,
                lineHeight: `${H.titleLineHeight}px`,
                color: tokens.colorNeutralForeground3,
                whiteSpace: 'nowrap',
              }}
              data-surface-part="header-status"
            >
              - {status}
            </span>
          )}
        </div>
        {(entity != null || activeForm) && (
          <div style={{ display: 'flex', alignItems: 'center', height: H.switcherHeight, marginTop: SUBTITLE_ROW_TOP }} data-surface-part="header-subtitle">
            {entity != null && (
              <span style={{ fontSize: tokens.fontSizeBase300, fontWeight: tokens.fontWeightSemibold, color: tokens.colorNeutralForeground2 }}>
                {entity}
              </span>
            )}
            {entity != null && activeForm && (
              <span aria-hidden="true" style={{ margin: `0 ${SUBTITLE_DOT_SPACING}px`, color: tokens.colorNeutralForeground2, lineHeight: '20px' }}>
                ·
              </span>
            )}
            {activeForm &&
              (forms && forms.length > 1 ? (
                <Menu
                  checkedValues={{ form: [activeForm.id] }}
                  onCheckedValueChange={(_e, data) => {
                    const id = data.checkedItems[0];
                    if (id && id !== activeForm.id) onFormChange?.(id);
                  }}
                >
                  <MenuTrigger disableButtonEnhancement>
                    <button type="button" className={styles.switcher} aria-label={`Form: ${activeForm.label}`} data-surface-part="form-switcher">
                      {activeForm.label}
                      <ChevronDown12Regular />
                    </button>
                  </MenuTrigger>
                  <MenuPopover>
                    <MenuList>
                      {forms.map((f) => (
                        <MenuItemRadio key={f.id} name="form" value={f.id}>
                          {f.label}
                        </MenuItemRadio>
                      ))}
                    </MenuList>
                  </MenuPopover>
                </Menu>
              ) : (
                <span style={{ fontSize: tokens.fontSizeBase300, fontWeight: tokens.fontWeightSemibold, color: tokens.colorNeutralForeground2 }}>
                  {activeForm.label}
                </span>
              ))}
          </div>
        )}
      </div>
      {(headerFields?.length || owner || actions) && (
        <div className={styles.fields} style={{ marginLeft: FIELDS_MIN_GAP }} data-surface-part="header-fields">
          {headerFields?.map((f, i) => (
            <React.Fragment key={f.id ?? `${f.label}-${i}`}>
              {i > 0 && <Divider />}
              <FieldTile field={f} />
            </React.Fragment>
          ))}
          {owner && (
            <>
              {headerFields?.length ? <Divider /> : null}
              <div style={{ display: 'flex', alignItems: 'flex-start' }} data-surface-part="header-owner">
                <div style={{ paddingTop: OWNER_AVATAR_TOP, marginRight: OWNER_NAME_GAP }}>
                  {owner.avatar ?? (
                    <Avatar
                      name={owner.name}
                      color="colorful"
                      size={H.ownerAvatarSize}
                      // Only when supplied: a badge is announced ("… available"), so never assume one.
                      badge={owner.presence ? { status: owner.presence, size: 'extra-small', style: cePresenceBadgeStyle } : undefined}
                    />
                  )}
                </div>
                <FieldTile
                  field={{
                    label: owner.label ?? 'Owner',
                    value: owner.onClick ? (
                      <button type="button" onClick={owner.onClick} className={styles.ownerLink} data-surface-part="header-owner-link">
                        {owner.name}
                      </button>
                    ) : (
                      <span style={{ color: tokens.colorBrandForegroundLink }}>{owner.name}</span>
                    ),
                  }}
                />
              </div>
            </>
          )}
          {actions != null && <div>{actions}</div>}
        </div>
      )}
      {onExpand && (
        <Button
          appearance="subtle"
          icon={expanded ? <ChevronUp20Regular /> : <ChevronDown20Regular />}
          aria-label={expanded ? 'Collapse header' : 'Expand header'}
          aria-expanded={!!expanded}
          onClick={onExpand}
          style={{ marginLeft: EXPAND_GAP, flexShrink: 0, minWidth: H.expandButtonSize, width: H.expandButtonSize, height: H.expandButtonSize }}
          data-surface-part="header-expand"
        />
      )}
    </div>
  );
}

/** Dynamics form header (Fluent v9): persona + title/status (left), KPI/header fields (right). */
export const FormHeader: React.FC<FormHeaderProps> = (props) => {
  const ambientLook = useLook();
  if ((props.look ?? ambientLook) === 'ce') return <CeFormHeader {...props} />;

  const { title, subtitle, status, titleColor, subtitleColor, persona, actions, className } = props;
  const rootStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '12px 24px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
  };
  const mainStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 };
  const titleRowStyle: React.CSSProperties = { display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' };
  const statusStyle: React.CSSProperties = { fontSize: tokens.fontSizeBase200, color: tokens.colorNeutralForeground3 };
  const subtitleStyle: React.CSSProperties = {
    fontSize: tokens.fontSizeBase200,
    color: subtitleColor || tokens.colorNeutralForeground3,
    marginTop: 2,
  };

  return (
    <div className={className} style={rootStyle}>
      <div style={mainStyle}>
        {persona}
        <div>
          <div style={titleRowStyle}>
            {title != null && (
              <Text weight="semibold" size={400} style={titleColor ? { color: titleColor } : undefined}>
                {title}
              </Text>
            )}
            {status != null && <span style={statusStyle}>{status}</span>}
          </div>
          {subtitle != null && <div style={subtitleStyle}>{subtitle}</div>}
        </div>
      </div>
      {actions != null && <div>{actions}</div>}
    </div>
  );
};

export default FormHeader;
