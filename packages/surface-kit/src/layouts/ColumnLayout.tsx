import React from 'react';
import { mergeStyles, type IStyle } from '@fluentui/react';
import type { ColumnLayoutProps } from '../types';
import { fieldGridStyle } from '../responsive/builders';
import { gridTemplateForColumns } from '../core/columns';

/** N-column grid for form fields. Responsive by default (caps at 2 cols <=768, 1 <=480). */
export const ColumnLayout: React.FC<ColumnLayoutProps> = ({
  columns,
  gap = '4px 24px',
  responsive = true,
  mode = 'media',
  className,
  style,
  children,
}) => {
  const base: IStyle = responsive
    ? (fieldGridStyle(columns, mode) as IStyle)
    : { display: 'grid', gridTemplateColumns: gridTemplateForColumns(columns) };
  const cls = mergeStyles(base, { gap } as IStyle, className);
  return (
    <div className={cls} style={style}>
      {children}
    </div>
  );
};

export default ColumnLayout;
