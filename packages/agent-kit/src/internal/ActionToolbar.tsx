import * as React from 'react';
import { Button, Tooltip, makeStyles, tokens, mergeClasses } from '@fluentui/react-components';
import { useRovingTabindex } from '../a11y/useRovingTabindex';

export interface ToolbarAction {
  key: string;
  label: string;
  icon: React.ReactElement;
  onClick: () => void;
  disabled?: boolean;
}

export interface ActionToolbarProps {
  actions: ToolbarAction[];
  label: string;
  className?: string;
}

const useStyles = makeStyles({
  root: {
    display: 'inline-flex',
    gap: tokens.spacingHorizontalXXS,
    alignItems: 'center',
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusMedium,
    boxShadow: tokens.shadow4,
    padding: tokens.spacingHorizontalXXS,
  },
  button: {
    // ★ A focus ring that survives Windows forced-colors. Once the kit owns its own focus
    //   management it owns the indicator too, and `outline: none` + box-shadow — the usual
    //   custom-focus recipe — disappears entirely under forced-colors.
    ':focus-visible': {
      outline: `2px solid ${tokens.colorStrokeFocus2}`,
      outlineOffset: '1px',
    },
  },
});

/**
 * The in-tree replacement for Fluent's `Toolbar`.
 *
 * ★ Fluent's reaches `useArrowNavigationGroup` → `getMover` → `core.attrHandlers.set`, which
 *   throws against a Dynamics form's tabster and unmounts the tree. For a row of buttons the
 *   WAI-ARIA pattern is small enough to own, which is why this is on the in-tree side of the
 *   split while `TabList` and `Tree` are not.
 *
 * ★ ONE tab stop for the whole row (roving tabindex), not one per button. A transcript of 20
 *   messages × 4 actions would otherwise add 80 tab stops between the reader and the composer.
 */
export function ActionToolbar({ actions, label, className }: ActionToolbarProps): React.ReactElement {
  const styles = useStyles();
  const roving = useRovingTabindex({ itemCount: actions.length, orientation: 'horizontal' });

  return (
    <div role="toolbar" aria-label={label} aria-orientation="horizontal" className={mergeClasses(styles.root, className)}>
      {actions.map((action, index) => {
        const item = roving.getItemProps(index);
        return (
          <Tooltip key={action.key} content={action.label} relationship="label" withArrow>
            <Button
              appearance="subtle"
              size="small"
              icon={action.icon}
              disabled={action.disabled}
              onClick={action.onClick}
              className={styles.button}
              {...item}
            />
          </Tooltip>
        );
      })}
    </div>
  );
}
