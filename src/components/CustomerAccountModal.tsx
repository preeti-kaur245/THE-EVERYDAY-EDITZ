import React, { useEffect } from 'react';
import { useStore } from '../context/StoreContext';

/**
 * Legacy modal bridge: routes any older setIsAccountOpen(true) caller
 * directly to the dedicated /account or /login pages (zero unnecessary popups).
 */
export const CustomerAccountModal: React.FC = () => {
  const { isAccountOpen, setIsAccountOpen, currentCustomer, navigateToAccount, navigateToAuth } = useStore();

  useEffect(() => {
    if (!isAccountOpen) return;
    setIsAccountOpen(false);
    if (currentCustomer) {
      navigateToAccount('profile');
    } else {
      navigateToAuth('login');
    }
  }, [isAccountOpen, currentCustomer, setIsAccountOpen, navigateToAccount, navigateToAuth]);

  return null;
};
