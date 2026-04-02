import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BudgetProvider } from '@/context/BudgetContext';
import Header, { Tab } from '@/components/Header';
import AboutModal from '@/components/AboutModal';
import { STORAGE_KEYS, DEFAULT_CATEGORIES } from '@/utils/constants';
import { format, startOfWeek, subWeeks } from 'date-fns';
import { useState } from 'react';

// Mock SVG image import used by Header and AboutModal
jest.mock('../assets/images/moneyFrog.svg', () => ({ src: '/moneyFrog.svg' }));

const thisMonday = startOfWeek(new Date(), { weekStartsOn: 1 });
const fourWeeksAgo = format(subWeeks(thisMonday, 4), 'yyyy-MM-dd');

function seedLocalStorage() {
  localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.WEEKLY_BUDGET, JSON.stringify(200));
  localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify([...DEFAULT_CATEGORIES]));
  localStorage.setItem(STORAGE_KEYS.FIRST_USE_DATE, JSON.stringify(fourWeeksAgo));
  localStorage.setItem(STORAGE_KEYS.LOCALE, JSON.stringify('en'));
  localStorage.setItem(STORAGE_KEYS.CURRENCY, JSON.stringify('USD'));
  localStorage.setItem(STORAGE_KEYS.RECURRING_EXPENSES, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.BUDGET_HISTORY, JSON.stringify([{ amount: 200, startDate: fourWeeksAgo }]));
}

// Mirrors page.tsx: Header + AboutModal wired together with tab and modal state
function HeaderWithModal() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [showAbout, setShowAbout] = useState(false);

  return (
    <>
      <Header activeTab={activeTab} onTabChange={setActiveTab} onAboutClick={() => setShowAbout(true)} />
      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
      <main data-testid="active-tab">{activeTab}</main>
    </>
  );
}

function renderHeader() {
  seedLocalStorage();
  return render(
    <BudgetProvider>
      <HeaderWithModal />
    </BudgetProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe('Header', () => {
  describe('navigation', () => {
    it('renders all three nav tabs', async () => {
      renderHeader();
      // Each tab label appears twice (desktop + mobile nav)
      expect((await screen.findAllByText('Dashboard')).length).toBeGreaterThanOrEqual(2);
      expect(screen.getAllByText('Expenses').length).toBeGreaterThanOrEqual(2);
      expect(screen.getAllByText('Settings').length).toBeGreaterThanOrEqual(2);
    });

    it('starts on the dashboard tab', async () => {
      renderHeader();
      expect(await screen.findByTestId('active-tab')).toHaveTextContent('dashboard');
    });

    it('switches to expenses tab when clicked', async () => {
      const user = userEvent.setup();
      renderHeader();

      await screen.findByTestId('active-tab');
      const expensesButtons = screen.getAllByText('Expenses');
      await user.click(expensesButtons[0]);

      expect(screen.getByTestId('active-tab')).toHaveTextContent('expenses');
    });

    it('switches to settings tab when clicked', async () => {
      const user = userEvent.setup();
      renderHeader();

      await screen.findByTestId('active-tab');
      const settingsButtons = screen.getAllByText('Settings');
      await user.click(settingsButtons[0]);

      expect(screen.getByTestId('active-tab')).toHaveTextContent('settings');
    });

    it('can navigate between all tabs', async () => {
      const user = userEvent.setup();
      renderHeader();

      await screen.findByTestId('active-tab');

      await user.click(screen.getAllByText('Expenses')[0]);
      expect(screen.getByTestId('active-tab')).toHaveTextContent('expenses');

      await user.click(screen.getAllByText('Settings')[0]);
      expect(screen.getByTestId('active-tab')).toHaveTextContent('settings');

      await user.click(screen.getAllByText('Dashboard')[0]);
      expect(screen.getByTestId('active-tab')).toHaveTextContent('dashboard');
    });
  });

  describe('about modal', () => {
    it('opens the about modal when the info button is clicked', async () => {
      const user = userEvent.setup();
      renderHeader();

      await screen.findByTestId('active-tab');
      await user.click(screen.getByTitle('About'));

      expect(screen.getByText(/privacy-first weekly budget tracker/i)).toBeInTheDocument();
      expect(screen.getByText(/version/i)).toBeInTheDocument();
    });

    it('closes the about modal via the close button', async () => {
      const user = userEvent.setup();
      renderHeader();

      await screen.findByTestId('active-tab');
      await user.click(screen.getByTitle('About'));
      expect(screen.getByText(/privacy-first/i)).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /close/i }));
      expect(screen.queryByText(/privacy-first/i)).not.toBeInTheDocument();
    });

    it('closes the about modal when Escape is pressed', async () => {
      const user = userEvent.setup();
      renderHeader();

      await screen.findByTestId('active-tab');
      await user.click(screen.getByTitle('About'));
      expect(screen.getByText(/privacy-first/i)).toBeInTheDocument();

      await user.keyboard('{Escape}');
      expect(screen.queryByText(/privacy-first/i)).not.toBeInTheDocument();
    });

    it('closes the about modal when clicking the backdrop', async () => {
      const user = userEvent.setup();
      renderHeader();

      await screen.findByTestId('active-tab');
      await user.click(screen.getByTitle('About'));

      // The backdrop is the outermost fixed div
      const backdrop = screen.getByText(/privacy-first/i).closest('.fixed')!;
      await user.click(backdrop);

      expect(screen.queryByText(/privacy-first/i)).not.toBeInTheDocument();
    });
  });

  describe('language selector', () => {
    it('renders the language dropdown', async () => {
      renderHeader();
      await screen.findByTestId('active-tab');

      const langSelect = screen.getByDisplayValue('English');
      expect(langSelect).toBeInTheDocument();
      expect(within(langSelect).getByText('Español')).toBeInTheDocument();
      expect(within(langSelect).getByText('Français')).toBeInTheDocument();
    });

    it('switches language and updates tab labels', async () => {
      const user = userEvent.setup();
      renderHeader();

      await screen.findByTestId('active-tab');
      await user.selectOptions(screen.getByDisplayValue('English'), 'es');

      // Tab labels should now be in Spanish
      expect(screen.getAllByText('Panel').length).toBeGreaterThanOrEqual(1); // Dashboard in Spanish
      expect(screen.getAllByText('Gastos').length).toBeGreaterThanOrEqual(1); // Expenses in Spanish
      expect(screen.getAllByText('Ajustes').length).toBeGreaterThanOrEqual(1); // Settings in Spanish
    });
  });
});
