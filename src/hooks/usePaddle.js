import { useState, useEffect, useCallback } from 'react';
import { initializePaddle } from '@paddle/paddle-js';
import { useAppStore } from '../store';

const PADDLE_TOKEN = "live_b719e178798ff8d1da2e0d42565";

export function usePaddle() {
  const [paddle, setPaddle] = useState(null);
  const user = useAppStore(s => s.user);
  const setScreen = useAppStore(s => s.setScreen);
  const refreshCredits = useAppStore(s => s.refreshCredits);

  const handleEvent = useCallback((event) => {
    if (event.name === 'checkout.completed') {
      setTimeout(async () => {
        await refreshCredits();
        setScreen('builder');
      }, 2000);
    }
  }, [refreshCredits, setScreen]);

  useEffect(() => {
    if (paddle) return;
    initializePaddle({
      environment: 'production',
      token: PADDLE_TOKEN,
      pwCustomer: user?.paddleCustomerId ? { id: user.paddleCustomerId } : undefined,
      eventCallback: handleEvent,
      checkout: {
        settings: { displayMode: 'overlay', theme: 'light', locale: 'en' }
      }
    }).then(instance => instance && setPaddle(instance));
  }, [handleEvent]);

  useEffect(() => {
    if (paddle && user?.paddleCustomerId) {
      paddle.Update({ pwCustomer: { id: user.paddleCustomerId } });
    }
  }, [paddle, user?.paddleCustomerId]);

  const openCheckout = useCallback((priceId, userId, userEmail) => {
    if (!paddle) return;
    paddle.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      customer: userEmail ? { email: userEmail } : undefined,
      customData: { userId },
    });
  }, [paddle]);

  return { paddle, openCheckout, isReady: !!paddle };
}