'use client';

import { FC, useEffect, useRef } from 'react';
import Toast from './Toast';
import { useToast } from '@smart-bazar/shared/contexts/ui/ToastContext';
import { useCartStore, CartItem } from '@smart-bazar/shared/stores/cartStore';

interface ToastContainerProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

const ToastContainer: FC<ToastContainerProps> = ({
  position = 'bottom-right',
}) => {
  const { toasts, removeToast, addToast } = useToast();
  const cartItems = useCartStore((state) => state.items);
  
  const prevItemsRef = useRef<CartItem[]>([]);
  const hasInitialized = useRef(false);

  useEffect(() => {
    prevItemsRef.current = cartItems;
    const timer = setTimeout(() => {
      hasInitialized.current = true;
    }, 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Monitor cart changes to display beautiful automated toasts
  useEffect(() => {
    if (!hasInitialized.current) {
      prevItemsRef.current = cartItems;
      return;
    }

    const prevItems = prevItemsRef.current;

    // 1. Check if the cart was cleared entirely
    if (cartItems.length === 0 && prevItems.length > 0) {
      addToast('Cart cleared!', 'warning', { title: 'Cart Updated' });
      prevItemsRef.current = cartItems;
      return;
    }

    // 2. Check for additions or quantity updates
    for (const item of cartItems) {
      const prevItem = prevItems.find(
        (p) => p.product.id === item.product.id && p.variantId === item.variantId
      );

      if (!prevItem) {
        addToast(
          `Added ${item.product.name}${item.variantName ? ` (${item.variantName})` : ''} to cart`,
          'success',
          { title: 'Item Added' }
      );
      } else if (item.quantity > prevItem.quantity) {
        addToast(
          `Increased ${item.product.name} quantity to ${item.quantity}`,
          'success',
          { title: 'Cart Updated' }
        );
      } else if (item.quantity < prevItem.quantity) {
        addToast(
          `Decreased ${item.product.name} quantity to ${item.quantity}`,
          'info',
          { title: 'Cart Updated' }
        );
      }
    }

    // 3. Check for individual item removals
    for (const prevItem of prevItems) {
      const item = cartItems.find(
        (p) => p.product.id === prevItem.product.id && p.variantId === prevItem.variantId
      );
      if (!item) {
        addToast(
          `Removed ${prevItem.product.name} from cart`,
          'warning',
          { title: 'Item Removed' }
        );
      }
    }

    prevItemsRef.current = cartItems;
  }, [cartItems, addToast]);

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  return (
    <div className={`fixed z-50 ${positionClasses[position]} flex flex-col gap-2 pointer-events-none`}>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          type={toast.type}
          title={toast.title}
          duration={toast.duration}
          onClose={() => removeToast(toast.id)}
        >
          {toast.children}
        </Toast>
      ))}
    </div>
  );
};

export default ToastContainer;