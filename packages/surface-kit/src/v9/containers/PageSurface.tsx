import React from 'react';
import type { PageSurfaceProps } from '../types';
import { FormSurface } from './FormSurface';

/** A full-page FormSurface (Fluent v9) — optionally centered with a comfortable max width. */
export const PageSurface: React.FC<PageSurfaceProps> = ({ centered, maxWidth, ...rest }) => (
  <FormSurface maxWidth={maxWidth ?? (centered ? 1200 : undefined)} {...rest} />
);

export default PageSurface;
