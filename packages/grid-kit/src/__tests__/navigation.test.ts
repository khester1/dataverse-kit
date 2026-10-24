import { describe, it, expect, vi, afterEach } from 'vitest';
import { navigateToTarget, type NavTarget } from '../navigation/navigateTo';
import { buildCellProps, type GridRenderContext } from '../adapters';
import { createCellRegistry } from '../registry';
import type { ColumnDef } from '../types';

describe('navigateToTarget', () => {
  it('no-ops and resolves when window/Xrm is unavailable (node / localhost)', async () => {
    await expect(
      navigateToTarget({ pageType: 'entityrecord', entityName: 'account', entityId: 'x' })
    ).resolves.toBeUndefined();
  });
});

describe('navigateToTarget — Xrm dispatch (mocked non-localhost window.Xrm)', () => {
  const navSpy = vi.fn().mockResolvedValue(undefined);
  const setXrm = (hostname: string): void => {
    (globalThis as { window?: unknown }).window = {
      location: { hostname },
      Xrm: { Navigation: { navigateTo: navSpy } },
    };
  };
  afterEach(() => {
    navSpy.mockClear();
    delete (globalThis as { window?: unknown }).window;
  });

  it('carries webresource `data` through to the pageInput', async () => {
    setXrm('contoso.crm.dynamics.com');
    await navigateToTarget({ pageType: 'webresource', webresourceName: 'new_report', data: 'id=42' });
    expect(navSpy).toHaveBeenCalledTimes(1);
    expect(navSpy.mock.calls[0][0]).toMatchObject({
      pageType: 'webresource',
      webresourceName: 'new_report',
      data: 'id=42',
    });
  });

  it('forwards target.navigationOptions when no explicit options arg is given', async () => {
    setXrm('contoso.crm.dynamics.com');
    await navigateToTarget({
      pageType: 'entityrecord',
      entityName: 'account',
      entityId: 'a1',
      navigationOptions: { target: 2, title: 'Account', width: 600 },
    });
    expect(navSpy.mock.calls[0][1]).toEqual({ target: 2, title: 'Account', width: 600 });
  });

  it('explicit navigationOptions arg takes precedence over target.navigationOptions', async () => {
    setXrm('contoso.crm.dynamics.com');
    await navigateToTarget(
      { pageType: 'entityrecord', entityName: 'account', navigationOptions: { target: 1 } },
      { target: 2, title: 'Override' }
    );
    expect(navSpy.mock.calls[0][1]).toEqual({ target: 2, title: 'Override' });
  });

  it('still no-ops on localhost even when Xrm is present', async () => {
    setXrm('localhost');
    await navigateToTarget({
      pageType: 'entityrecord',
      entityName: 'account',
      navigationOptions: { target: 2 },
    });
    expect(navSpy).not.toHaveBeenCalled();
  });
});

describe('navigation onLinkClick synthesis (buildCellProps)', () => {
  const ctxWith = (
    navigateTo?: (it: Record<string, unknown>) => NavTarget | undefined
  ): GridRenderContext => ({ registry: createCellRegistry(), navigateTo });

  it('synthesizes onLinkClick for link/lookup columns when navigateTo is set', () => {
    let seen: Record<string, unknown> | null = null;
    const ctx = ctxWith((it) => {
      seen = it;
      return { pageType: 'entityrecord', entityName: 'account', entityId: String(it.id) };
    });
    const col: ColumnDef = { key: 'n', fieldName: 'name', name: 'Name', rendererType: 'link' };
    const props = buildCellProps(col, { key: 'r', id: 'abc', name: 'Acme' }, ctx);
    expect(typeof props.column.onLinkClick).toBe('function');
    props.column.onLinkClick!(props.item);
    expect((seen as Record<string, unknown> | null)?.id).toBe('abc');
  });

  it('does not override an explicit onLinkClick', () => {
    const explicit = (): void => undefined;
    const ctx = ctxWith(() => ({ pageType: 'entityrecord', entityName: 'a' }));
    const col: ColumnDef = {
      key: 'n',
      fieldName: 'name',
      name: 'Name',
      rendererType: 'lookup',
      onLinkClick: explicit,
    };
    const props = buildCellProps(col, { key: 'r' }, ctx);
    expect(props.column.onLinkClick).toBe(explicit);
  });

  it('skips non-link/lookup columns', () => {
    const ctx = ctxWith(() => ({ pageType: 'entityrecord', entityName: 'a' }));
    const col: ColumnDef = { key: 't', fieldName: 't', name: 'T', rendererType: 'text' };
    const props = buildCellProps(col, { key: 'r' }, ctx);
    expect(props.column.onLinkClick).toBeUndefined();
  });

  it('does nothing when navigateTo is not set', () => {
    const ctx = ctxWith(undefined);
    const col: ColumnDef = { key: 'n', fieldName: 'name', name: 'Name', rendererType: 'link' };
    const props = buildCellProps(col, { key: 'r' }, ctx);
    expect(props.column.onLinkClick).toBeUndefined();
  });
});
