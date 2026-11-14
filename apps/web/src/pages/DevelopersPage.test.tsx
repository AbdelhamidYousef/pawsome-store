import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AGENT_TOOLS } from '../features/agent/tools';
import { TEST_IDS } from '../lib/test-ids';
import { renderApp } from '../test/render';

describe('developers page', () => {
  it('documents every registered tool, rendered from the registry', async () => {
    renderApp('/developers');
    const page = await screen.findByTestId(TEST_IDS.pageDevelopers);
    const names = within(page)
      .getAllByTestId(TEST_IDS.agentToolName)
      .map((el) => el.textContent);
    expect(names).toEqual(AGENT_TOOLS.map((t) => t.name));
    expect(names).toHaveLength(6);
  });

  it('says it is experimental and what is not exposed', async () => {
    renderApp('/developers');
    expect(await screen.findByRole('note')).toHaveTextContent(/experimental browser feature/i);
    expect(screen.getByText(/Checkout and payment/)).toBeInTheDocument();
    expect(screen.getByText(/chrome:\/\/flags\/#enable-webmcp-testing/)).toBeInTheDocument();
  });

  it('is linked from the footer and is indexable', async () => {
    renderApp('/developers');
    const footer = await screen.findByRole('contentinfo');
    expect(within(footer).getByRole('link', { name: 'For developers' })).toHaveAttribute(
      'href',
      '/developers',
    );
    expect(document.head.querySelector('meta[name="robots"][content*="noindex"]')).toBeNull();
  });
});
