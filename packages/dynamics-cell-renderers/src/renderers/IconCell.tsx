import React, { useCallback } from 'react';
import { IconButton, IIconProps } from '@fluentui/react';
import { CellRendererProps } from '../types';
import { iconButtonCellClass } from '../styles';

/**
 * Icon cell renderer.
 * Displays an icon button with click handler.
 */
export function IconCell<T>({ item, column }: CellRendererProps<T>): JSX.Element {
  const iconProps: IIconProps = {
    iconName: column.iconName || 'More',
  };

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation(); // Prevent row click
      if (column.onIconClick) {
        column.onIconClick(item);
      }
    },
    [column, item]
  );

  return (
    <div className={iconButtonCellClass}>
      <IconButton
        iconProps={iconProps}
        title={column.iconTitle || column.name}
        ariaLabel={column.iconTitle || column.name}
        onClick={handleClick}
        styles={{
          root: {
            width: 32,
            height: 32,
          },
          rootHovered: {
            backgroundColor: '#f3f2f1',
          },
        }}
      />
    </div>
  );
}
