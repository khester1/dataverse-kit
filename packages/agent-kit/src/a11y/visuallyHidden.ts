import { makeStyles } from '@fluentui/react-components';

/**
 * Content available to assistive technology and not to sight.
 *
 * ★ NOT `display:none` and NOT `visibility:hidden` — both remove the node from the
 *   accessibility tree, which is the opposite of the intent. The clip-rect recipe is the one
 *   that keeps it announced.
 */
export const useVisuallyHiddenStyles = makeStyles({
  root: {
    position: 'absolute',
    width: '1px',
    height: '1px',
    margin: '-1px',
    padding: '0',
    overflow: 'hidden',
    clip: 'rect(0 0 0 0)',
    clipPath: 'inset(50%)',
    whiteSpace: 'nowrap',
  },
});
