/**
 * Utility to trigger premium particle burst animation from click coordinates
 * and notify listeners to bounce the cart icons.
 */
export function triggerAddToCartAnimation(e: any) {
  if (typeof window === 'undefined') return;

  // Dispatch global event for cart bounce animation
  window.dispatchEvent(new CustomEvent('cart-bounce'));

  // Extract click coordinates from MouseEvent or TouchEvent
  let clientX = 0;
  let clientY = 0;

  if (e && 'clientX' in e) {
    clientX = e.clientX;
    clientY = e.clientY;
  } else if (e && 'touches' in e && e.touches.length > 0) {
    clientX = e.touches[0].clientX;
    clientY = e.touches[0].clientY;
  } else if (e && e.target) {
    // Fallback to target element center if clientX/clientY not present
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    clientX = rect.left + rect.width / 2;
    clientY = rect.top + rect.height / 2;
  } else {
    // Absolute fallback
    clientX = window.innerWidth / 2;
    clientY = window.innerHeight / 2;
  }

  // Create a container for the particles
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '0';
  container.style.top = '0';
  container.style.width = '100vw';
  container.style.height = '100vh';
  container.style.pointerEvents = 'none';
  container.style.zIndex = '99999';
  document.body.appendChild(container);

  // Vibrant HSL colors inspired by the theme
  const colors = [
    'hsl(140, 100%, 39%)', // primary green
    'hsl(40, 100%, 50%)',  // accent amber
    'hsl(0, 100%, 66%)',   // accent coral
    'hsl(263, 83%, 58%)',  // accent violet
    'hsl(199, 89%, 48%)',  // accent sky
  ];
  
  const particleCount = 14;

  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    const size = Math.random() * 8 + 6; // 6px to 14px
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    particle.style.position = 'absolute';
    particle.style.left = `${clientX - size / 2}px`;
    particle.style.top = `${clientY - size / 2}px`;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.borderRadius = '50%';
    particle.style.backgroundColor = color;
    particle.style.boxShadow = '0 2px 6px rgba(0,0,0,0.1)';
    
    // Choose random angle and distance for burst
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * 90 + 35; // 35px to 125px
    const tx = Math.cos(angle) * distance;
    const ty = Math.sin(angle) * distance - Math.random() * 30; // slight upward drag
    
    // Set initial animations
    particle.style.transform = 'translate3d(0, 0, 0) scale(1)';
    particle.style.opacity = '1';
    particle.style.transition = 'all 0.65s cubic-bezier(0.15, 0.85, 0.45, 1)';
    
    container.appendChild(particle);
    
    // Trigger burst in next frame
    requestAnimationFrame(() => {
      particle.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(0)`;
      particle.style.opacity = '0';
    });
  }
  
  // Clean up container
  setTimeout(() => {
    container.remove();
  }, 750);
}
