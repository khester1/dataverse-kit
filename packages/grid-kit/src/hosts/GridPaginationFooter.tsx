import React from 'react';
import { DefaultButton, Stack, Text } from '@fluentui/react';
import type { GridPaginationState } from '../types';

/**
 * Presentational pager shared by all hosts. The consumer pre-slices `items` to
 * the page; this only renders the page indicator + prev/next controls.
 */
export const GridPaginationFooter: React.FC<{
  pagination: GridPaginationState;
  onPageChange?: (page: number) => void;
}> = ({ pagination, onPageChange }) => {
  const { currentPage, pageSize, totalItems } = pagination;
  const totalPages = Math.max(1, Math.ceil(totalItems / Math.max(1, pageSize)));
  return (
    <Stack
      horizontal
      verticalAlign="center"
      horizontalAlign="end"
      tokens={{ childrenGap: 8 }}
      styles={{ root: { paddingTop: 8 } }}
    >
      <Text variant="small">{`Page ${currentPage} of ${totalPages} · ${totalItems} item${totalItems === 1 ? '' : 's'}`}</Text>
      <DefaultButton
        text="Previous"
        iconProps={{ iconName: 'ChevronLeft' }}
        disabled={currentPage <= 1}
        onClick={() => onPageChange?.(currentPage - 1)}
      />
      <DefaultButton
        text="Next"
        iconProps={{ iconName: 'ChevronRight' }}
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange?.(currentPage + 1)}
      />
    </Stack>
  );
};
